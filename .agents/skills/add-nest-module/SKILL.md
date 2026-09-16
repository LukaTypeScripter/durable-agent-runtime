---
name: add-nest-module
description: Create a new NestJS module, service, or provider in this repo's house style. Use when adding a subsystem (queue, MCP client, LLM provider, API surface) — covers the ESM import rule that breaks the build if missed.
---

## The rule that catches everyone

This project is ESM with `nodenext` resolution. **Every relative import needs a
`.js` extension**, even though the file on disk is `.ts`:

```ts
import { AppModule } from './app.module.js';
```

Without the extension — `from './app.module'` — the build fails.

Package imports (`@nestjs/common`, `drizzle-orm/node-postgres`) are unaffected.

Type-only imports are separated, matching the existing files:

```ts
import type { AppConfig } from '../config/configuration.js';
```

## Layout

One folder per subsystem under `src/`, named for the thing it owns:

```
src/runs/
├── runs.module.ts
├── runs.service.ts
├── runs.controller.ts
└── runs.service.spec.ts
```

The controller exists only if the subsystem has an HTTP surface.

Keep files focused. A service that has grown past a few hundred lines is doing
more than one job — split it before adding to it.

## The module

```ts
import { Module } from '@nestjs/common';
import { RunsService } from './runs.service.js';

@Module({
  providers: [RunsService],
  exports: [RunsService],
})
export class RunsModule {}
```

Register it in `src/app.module.ts`'s `imports`. Export only what other modules
genuinely consume — an unexported provider is free to change.

**`@Global()` is for infrastructure, not features.** `DrizzleModule` is global
because the journal is touched from controllers, workers, and health checks
alike, and threading it through every import list would be noise. A feature
module is never global; import it explicitly so the dependency is visible.

## Reading configuration

Never `process.env`. Inject the typed config service and read a dotted path with
`{ infer: true }` — without it the result is `any` and the path is unchecked:

```ts
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration.js';

@Injectable()
export class RunsService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  private readonly maxTurns = this.config.get('budgets.maxTurns', { infer: true });
}
```

Adding a new setting is its own skill — see `add-env-var`.

## Non-class providers

Use a `Symbol` token and a factory, as `DrizzleModule` does, and export a type
alias so consumers are typed:

```ts
export const RUN_QUEUE = Symbol('RUN_QUEUE');

{
  provide: RUN_QUEUE,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) => /* ... */,
}
```

Consumers inject with `@Inject(RUN_QUEUE)`.

## Resources that must be released

Anything holding a socket, pool, or queue connection implements
`OnApplicationShutdown` and closes it there. Shutdown hooks are already enabled
in `main.ts`, so this is what lets in-flight turns finish and a redeploy lose no
work.

```ts
export class RunsModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await this.queue.close();
  }
}
```

## Durable-path constraints

If the module touches a run, two rules from the architecture apply:

- **Journal before the side effect.** The event recording an LLM call or tool
  call is written in the same transaction that enqueues the follow-up work. A
  crash between the two is what the journal exists to survive.
- **Never block on a person.** A run awaiting approval has no job in flight — no
  held worker, no open connection, no timer. Resuming is an enqueue triggered by
  the approval API.

## Verify

```
npm run build && npm test && npm run lint
```

Tests are Vitest — write the failing test before the implementation.

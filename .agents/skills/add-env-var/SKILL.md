---
name: add-env-var
description: Add, rename, or remove an environment variable — timeout, budget, secret, feature flag, or connection string. Use whenever a value needs to come from the environment, because getting only part of the way through leaves the variable silently unreadable.
---

## Why this is a skill

The variable has to land in three files. Miss `configuration.ts` and nothing can
read the value; miss `env.example` and the next person's boot fails with no hint
which variable they're missing. Nothing catches either mistake at compile time.

**`process.env` is read in exactly one place** — the loader in
`src/config/config.module.ts`. Never reach for it anywhere else, not even in a
script or a test.

## Steps

### 1. Declare it in `src/config/env.schema.ts`

Add the key to `envSchema`, in the group it belongs to — groups are separated by
blank lines, in the same order as the config tree. Reuse the helpers at the top
of the file rather than rebuilding them:

- `durationMs` — coerced positive integer, for anything named `*_MS`
- `urlString` — non-empty and parseable by `URL.canParse`
- `booleanish` — accepts `true/false/1/0/yes/no`, yields a real boolean

```ts
MY_FEATURE_TIMEOUT_MS: durationMs.default(5_000),
```

Choosing between a default and `.optional()`:

- **Has a sane default** → `.default(value)`. Prefer this; it keeps `.env` small.
- **Required, no safe default** (a connection string, a secret) → no `.default()`.
  The boot fails with the variable named, which is the correct outcome.
- **Genuinely optional** (a second provider's API key) → `.optional()`, and the
  consuming code must handle `undefined`.

Secrets get a minimum length: `z.string().min(32)`.

`validateEnv` strips empty strings before parsing, so `MY_VAR=` in a `.env` file
behaves as unset rather than as `''`. Don't add your own empty-string handling.

Cross-field requirements ("at least one of A or B") go in a `.refine` on the
schema object, not in consuming code.

### 2. Expose it in `src/config/configuration.ts`

Map it into the grouped tree under the right group, renaming from
`SCREAMING_SNAKE` to camelCase. The group names — `app`, `database`, `redis`,
`llm`, `budgets` — are the vocabulary the rest of the app uses; add a new group
only for a genuinely new subsystem.

```ts
myFeature: {
  timeoutMs: env.MY_FEATURE_TIMEOUT_MS,
},
```

`AppConfig` is inferred from this function's return type, so the new path is
immediately type-checked everywhere.

### 3. Document it in `env.example`

Same section, same order as the schema, with the default as the value. Mark it
`# REQUIRED` if it has no default. **Never put a real secret here** — leave it
empty and add the generator command as a comment above it.

Then add it to your own `.env`. That file is git-ignored and must stay that way.

### 4. Read it

Inject the typed config service and read the dotted path with `infer: true`:

```ts
constructor(private readonly config: ConfigService<AppConfig, true>) {}

const timeout = this.config.get('myFeature.timeoutMs', { infer: true });
```

Without `{ infer: true }` the result is typed `any` and the path is unchecked —
always pass it.

## Verify

```
npm run build
```

Then confirm both directions actually behave:

- **Missing/invalid** — unset the variable and start the app. It must fail at
  boot naming your variable, not fail later at first use.
- **Present** — start with it set and confirm the value arrives where it's read.

A variable that type-checks but was never added to `configuration.ts` will read
back as `undefined` at runtime while looking perfectly fine in the editor.

---
name: angular-service
description: Use when adding or changing an Angular service, HTTP call, or injected dependency in apps/web, or when calling the runs API from the browser.
---

# Angular services

One responsibility each, injected with `inject()`, typed from `@dar/contracts`.

## The shape

```ts
@Service()
export class RunsService {
  private readonly http = inject(HttpClient);

  create(run: CreateRunDto): Observable<RunResponse> {
    return this.http.post<RunResponse>('/runs', run);
  }
}
```

`@Service()` is the v22 decorator for singletons and is preferred over
`@Injectable({ providedIn: 'root' })` in new code. Use `@Injectable()` only for
a service deliberately scoped to a component or route.

**`inject()`, not constructor parameters.** It works in field initialisers,
functional guards, interceptors, and resolvers, where constructor injection
cannot reach.

## Talking to the API

Never hardcode a host. The dev server proxies `/runs` to the API
(`proxy.conf.json`), so request paths are relative and there is no base URL or
CORS configuration to maintain.

**Request and response types come from `@dar/contracts`** — `CreateRunDto`,
`DecideApprovalDto`, `RunResponse`. These are the same zod schemas the API
validates against, so a shape change breaks compilation on both sides instead of
failing at runtime.

Do not import types from `@dar/api`. It would pull Drizzle and `pg` into the
browser bundle, and its `Run` type carries `Date` objects where the wire carries
ISO strings.

## Where a service belongs

| Scope | Location |
|---|---|
| The whole app needs it (auth, interceptors, error handling) | `core/` |
| One feature needs it | `features/<name>/data-access/` |

Placement rules are in `angular-architecture`.

## State in services

Hold state in signals and expose it read-only:

```ts
private readonly runsState = signal<RunResponse[]>([]);
readonly runs = this.runsState.asReadonly();
readonly pending = computed(() => this.runs().filter((r) => r.status === 'pending'));
```

Callers read and subscribe; only the service mutates, via `set()` or `update()`.
Never `mutate()`.

## Common mistakes

- **A service that both fetches and formats for display.** Split it — formatting
  belongs in a `computed()` or a pipe.
- **Subscribing inside a service** and storing the result as a side effect. Return
  the observable and let the caller use the `async` pipe, or convert deliberately.
- **`providedIn: 'root'` on something that should be per-route**, which quietly
  shares state between navigations.

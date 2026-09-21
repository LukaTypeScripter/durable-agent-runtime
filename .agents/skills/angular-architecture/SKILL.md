---
name: angular-architecture
description: Use when adding a feature, page, route, or shared component to apps/web, or when deciding which folder Angular code belongs in.
---

# Modular architecture: divide and conquer

The app is a set of self-contained features over a thin shared base. A feature
owns its routes, its data access, and its UI, and is lazy-loaded.

**The property that keeps it true:** deleting a feature must be removing one
folder and one route entry. If deleting it breaks another feature, the boundary
was already wrong.

## Layout

```
apps/web/src/app/
├── core/                    singletons: interceptors, guards, app-wide services
├── shared/                  reusable presentational components, pipes, directives
├── features/
│   └── runs/
│       ├── runs.routes.ts   the lazy entry point
│       ├── data-access/     services and signal state for this feature
│       ├── ui/              presentational components used only here
│       └── pages/           routed components
└── app.routes.ts
```

## The dependency rule

```
features  →  shared  →  core
```

Arrows point one way only.

- **A feature never imports from another feature.** When two need the same
  thing, it moves down into `shared/` or `core/` — it does not move sideways.
- **`shared/` never imports from `features/`.** A shared component that knows
  about runs is not shared; it belongs to the runs feature.
- **`core/` imports nothing from either.** It is providers and cross-cutting
  concerns, not UI.

Domain types come from `@dar/contracts`, so `shared/` can be typed without
depending on a feature.

## Lazy loading

Every feature enters through `loadChildren`, so its code is a separate bundle:

```ts
export const routes: Routes = [
  {
    path: 'runs',
    loadChildren: () => import('./features/runs/runs.routes').then((m) => m.RUNS_ROUTES),
  },
];
```

Inside the feature, `runs.routes.ts` uses `loadComponent` per page. A feature
imported eagerly anywhere else silently lands in the initial bundle — check the
build output if a chunk grows unexpectedly.

## Pages and UI components

| | Injects services | Receives data | Routed |
|---|---|---|---|
| `pages/` | yes | from services | yes |
| `ui/` | no | `input()` only | no |

Pages hold the wiring; `ui/` components take inputs and emit outputs. A `ui/`
component that injects a feature service can't be reused or tested in isolation,
which is the whole reason it exists.

## Common mistakes

- **Putting a service in `core/` because it is "important".** `core/` is for
  things the whole app needs. A service only the runs feature uses lives in
  `features/runs/data-access/`, however central it feels.
- **A `shared/` component with a feature-shaped input.** If its input type is a
  feature's internal model, it is not shared.
- **Barrel files across boundaries.** An `index.ts` re-exporting a whole feature
  invites eager imports and defeats lazy loading.

Component conventions: see `angular-component`. Services: see `angular-service`.

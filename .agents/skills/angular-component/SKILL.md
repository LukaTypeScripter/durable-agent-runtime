---
name: angular-component
description: Use when writing or changing an Angular component, template, or form in apps/web, including inputs, outputs, signals, and control flow.
---

# Angular components

Angular 22, standalone, signal-based. Several things that were required in older
Angular are now defaults, and writing them out is wrong rather than merely
redundant.

## Do not write these

| Don't | Why |
|---|---|
| `standalone: true` | The default since v20 |
| `changeDetection: OnPush` | The default since v22 |
| `@HostBinding` / `@HostListener` | Use the `host` object in the decorator |
| `imports: [CommonModule]` | Import only what the template uses: `DatePipe`, `AsyncPipe` |
| `*ngIf`, `*ngFor`, `*ngSwitch` | Use `@if`, `@for`, `@switch` |
| `ngClass`, `ngStyle` | Use `class` and `style` bindings |
| `@Input()`, `@Output()` decorators | Use `input()` and `output()` |
| `signal.mutate(...)` | Use `set()` or `update()` |

## The shape

```ts
@Component({
  selector: 'app-run-card',
  imports: [DatePipe],
  host: { class: 'run-card', '[class.is-failed]': 'isFailed()' },
  template: `
    <h3>{{ run().goal }}</h3>
    <time>{{ run().createdAt | date }}</time>
    @if (isFailed()) {
      <p role="alert">{{ run().failReason }}</p>
    }
    <button type="button" (click)="retry.emit(run().id)">Retry</button>
  `,
})
export class RunCard {
  readonly run = input.required<RunResponse>();
  readonly retry = output<string>();
  protected readonly isFailed = computed(() => this.run().status === 'failed');
}
```

Inline templates for small components; external ones use paths relative to the
component file.

## State

- `input()` / `output()` for the public surface, `input.required<T>()` when it
  must be provided
- `model()` for two-way binding — not an `input()` paired with an `output()`
- `computed()` for anything derivable; never a field you keep in sync by hand
- `linkedSignal()` when state derives from several reactive sources and must
  stay synchronized
- `@for` requires `track`

## Forms

Prefer Signal Forms from `@angular/forms/signals` (stable in v22) — signal state,
type-safe field access, schema validation. Reactive forms otherwise. Never
template-driven.

Validation schemas come from `@dar/contracts`, so the browser enforces the same
rules the API does.

## Accessibility is a requirement, not a polish pass

Must pass AXE checks and WCAG AA: focus management, colour contrast, correct
ARIA. Concretely: every control reachable and labelled, `role="alert"` for async
errors, visible focus, no colour as the only signal of state.

Use `NgOptimizedImage` for static images — it does not work for inline base64.

## Common mistakes

- **Logic in the template.** Push it into a `computed()`; templates stay
  declarative and the logic becomes testable.
- **Assuming globals.** `new Date()` in a template is not available. Pass values
  in or compute them in the class.
- **Reaching for `effect()` to derive state.** If it computes a value from other
  signals, it is a `computed()`. `effect()` is for side effects only.

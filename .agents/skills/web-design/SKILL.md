---
name: web-design
description: Use when building or restyling any screen, component, empty state, or piece of interface copy in apps/web, or when choosing colours, type, spacing, or wording for the UI.
---

# Design system

An operator console for engineers. The distinctive content is the **journal** —
an append-only sequence of steps per run. Design around that, not around
dashboard furniture.

Tokens live in `apps/web/src/styles/_tokens.scss`. **Use the variables, never a
literal hex or px for colour, type size, spacing, or radius.** A literal in a
component means either the token is missing or the design is drifting.

## The colour rule that matters

**Saturated colour is reserved for runs that need a human.** The runtime's whole
premise is that runs proceed without you *except* when they can't, so
`--amber` marks `awaiting_approval` and nothing else. Running, completed, and
failed are `--ink` and `--graphite`, distinguished by weight and shape.

`--signal` is for interactive affordances — links, primary buttons, focus rings.
It is not a status colour.

Never encode state in colour alone: pair it with a label or a shape. AXE and
WCAG AA are requirements, not a final pass.

## Tokens

| Group | Use |
| --- | --- |
| `--paper`, `--mist`, `--line` | Ground, recessed rails, hairline borders |
| `--ink`, `--graphite` | Primary text, metadata |
| `--signal`, `--amber` | Actions; runs awaiting a person |
| `--text-xs` … `--text-2xl` | Type scale. Do not interpolate between steps |
| `--space-1` … `--space-12` | Spacing, 4px based |
| `--radius` (4px), `--radius-lg` | Minimal rounding |
| `--measure` (68ch) | Max line length for prose |

**Borders, not shadows.** Separate surfaces with a 1px `--line`. Shadows are for
things that genuinely float — a menu, a dialog.

## Type

IBM Plex Sans for everything readable. **IBM Plex Mono only for identifiers** —
step keys (`turn:1:tool:0`), run ids, model names. Mono is semantic here, not
decorative; using it for ordinary labels breaks that signal.

Left-align on a single axis. No centred body text.

## Copy

Buttons name what happens: `Start a run`, `Approve`, `Decline`. The same word
carries through the flow — `Approve` produces `Approved`.

Empty states invite: `No runs yet. Start one to see it here.` Failures state the
cause without apology: `Stopped: turn budget exhausted`. Sentence case
throughout. Plain nouns over system vocabulary — `Waiting for approval`, not
`status=awaiting_approval`.

## Do not reach for these

They read as generated, and none of them fit this product:

- A row of stat tiles with big numbers and a gradient accent
- Every piece of content chopped into identical rounded cards
- ALL-CAPS eyebrow labels above headings
- `→` appended to button or link text
- Meta strings joined with middle dots
- Fade-and-slide-up entrances on each section, hover transitions on every card

Motion answers an action — a row expanding, an approval confirming. Nothing
animates on load.

## Before you ship a screen

Keyboard-reachable with visible focus, readable at 320px wide, no colour-only
state, no literal hex or px, and one thing on the screen is clearly the most
important.

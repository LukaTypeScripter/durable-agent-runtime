# durable-agent-runtime

Runtime that runs LLM agents durably. Agents are **configuration** (DB rows),
and a run survives process restarts.

## Architecture: turn-scoped jobs over an append-only journal

A run is a row plus an immutable `run_events` journal. One queue job executes
exactly **one turn** — load state from the journal, one LLM call, its tool calls,
append events, enqueue the next turn, ack. The loop lives in the queue, not in a
function.

- Every event carries a `(run_id, step_key)` unique constraint. A retried turn
  must re-read the recorded result rather than pay for the call twice.
- A run awaiting human approval has **no job in flight**. Never hold a worker,
  a connection, or a timer while waiting for a person.
- Budgets (turns, tool calls, tokens, cost, duration) are enforced at the turn
  boundary, before the next LLM call is made.

## Rules

**ESM.** `"type": "module"` with `nodenext`. Relative imports need the `.js`
extension even in TypeScript: `import { AppModule } from './app.module.js'`.

**Config.** `process.env` is read in exactly one place: `src/config/env.schema.ts`.
Adding a variable means touching three files — the zod schema, the grouped tree in
`configuration.ts`, and `env.example`. Everywhere else, inject
`ConfigService<AppConfig, true>` and read it typed:
`config.get('database.url', { infer: true })`.

**Database.** Drizzle over `pg`. Tables go in `src/db/schema.ts`; inject the
`DRIZZLE` token for a typed client. Migrations are generated with
`npm run db:generate` — never hand-edit the SQL in `drizzle/`.

**Secrets.** `.env` is git-ignored and stays that way. Never put a real key,
pepper, or signing secret in `env.example`, a test, or a commit.

**No comments.** This project is comment-free. Do not add comments to code you
write or touch — no explanatory `//` lines, no JSDoc blocks, no section banners,
no `TODO`/`FIXME` markers, no commented-out code. Say it in a name instead: if a
line needs explaining, extract it into a well-named function or constant. When a
comment is genuinely wanted, the repository owner will ask for it. Do not remove
comments the owner has added.

**Tests.** Vitest. Write the failing test before the fix.

**Commits.** See [Commit messages](#commit-messages) below. Commit only when
asked, and never with `--no-verify`.

## Commit messages

Applies to every agent and every tool that writes a commit or a pull request
description in this repository. No exceptions, no per-tool variants.

**No self-attribution.** The commit is authored by the repository owner alone.
Do not add yourself as a contributor: no `Co-Authored-By:` trailer naming an AI
or a tool, no "Generated with" footer, no tool name, link, or emoji anywhere in
the subject or body. A reader should not be able to tell from the message which
editor or model produced the change.

**Format.** Conventional Commits:

```
type(scope): subject

Optional body explaining why the change was needed.

Refs #123
```

- **type** — `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `chore`.
- **scope** — the module touched: `config`, `db`, `runs`, `queue`, `llm`.
  Omit the scope rather than invent one.
- **subject** — imperative mood, lower case, no trailing period, ≤ 72 characters.
  "add turn journal", not "added turn journal" or "adding turn journal".
- **breaking change** — `!` after the scope (`feat(runs)!:`) plus a
  `BREAKING CHANGE:` paragraph describing the migration.

**Body.** Include one only when the change needs explaining, and use it for
**why**, not what — the diff already says what. Wrap at 72 characters. Skip the
body entirely for a typo fix; do not pad a small commit with a paragraph.

**Honesty.** Describe what the commit actually does. Never claim a fix is
verified, tested, or complete unless the verification below was run and passed.
If something was left out or is known broken, say so in the body.

**One concern per commit.** Don't bundle an unrelated cleanup into a feature
commit. If the work splits cleanly, make two commits.

## Verify before claiming done

```
npm run build && npm test && npm run lint
```

Run it and read the output. Don't report work as passing on the strength of
having written it.

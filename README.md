# durable-agent-runtime

A runtime for running LLM agents durably. Agents are configuration, not code:
you create one through the API, give it a set of tools, and start runs that
survive process restarts, deploys, and crashes.

## How a run works

A run is a row plus an append-only `run_events` journal. One queue job executes
exactly one **turn** — load state from the journal, make one LLM call, execute
its tool calls, append the resulting events, enqueue the next turn.

Putting the loop in the queue rather than in a function is what makes the rest
work:

- **Crash recovery.** A turn that dies mid-flight is retried. Every event carries
  a unique `(run_id, step_key)`, so the retry re-reads the recorded response
  instead of paying for the LLM call or the tool side effect a second time.
- **Human approval.** A run waiting on a person has no job in flight at all — no
  held worker, no open connection, no timer. It can wait a week for nothing, and
  resumes when the approval endpoint enqueues the next turn.
- **Budgets.** Turn boundaries are where token, cost, duration, and tool-call
  caps are enforced, before the next call is made rather than after.

Callers start a run and get a run id back immediately, then poll it for state.

## Stack

NestJS 12 on ESM, Postgres via Drizzle for the journal and state, Redis via
BullMQ for turn scheduling, and an Anthropic adapter.

## Getting started

```
npm install
cp env.example .env
npm run infra:up
npm run db:migrate
npm run start:dev
```

`DATABASE_URL` is the only variable you must fill in. `ANTHROPIC_API_KEY` is
optional — without it the runtime still boots, which is what lets the turn loop
be developed and tested against a fake provider.

Every variable is validated at boot. A missing or malformed one stops the process
with all the problems listed at once, rather than failing later at first use.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Run the app with reload |
| `npm run build` | Compile to `dist/` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests |
| `npm run lint` | Lint with type information |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database |
| `npm run infra:up` / `infra:down` | Start or stop Postgres and Redis |

## Working in this repo

`AGENTS.md` holds the conventions — coding rules, commit format, and the durable
path's non-negotiables. Editors that read `AGENTS.md` pick it up automatically.
Task-specific guides live in `.agents/skills/`.

## Status

Early. The configuration layer, database module, and local infrastructure are in
place. The journal schema, turn loop, queue workers, and HTTP API are not built
yet.

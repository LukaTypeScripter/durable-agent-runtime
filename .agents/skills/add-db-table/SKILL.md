---
name: add-db-table
description: Add or alter a Drizzle table and generate its migration. Use for any schema change in src/db/schema.ts, and before touching anything in drizzle/ — generated SQL is never hand-edited.
---

## Steps

### 1. Define the table in `src/db/schema.ts`

Every table the runtime owns is declared or re-exported from this one file —
`drizzle-kit` reads only this path.

```ts
import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const runs = pgTable(
  'runs',
  {
    id: uuid().primaryKey().defaultRandom(),
    agentId: uuid().notNull().references(() => agents.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    status: varchar({ length: 32 }).notNull(),
  },
  (table) => [index('runs_agent_created_idx').on(table.agentId, table.createdAt)],
);
```

Conventions that are not optional here:

- **Casing.** Both `drizzle.config.ts` and the runtime client are set to
  `snake_case`, so write column keys in camelCase and let Drizzle derive
  `agent_id`. Never pass an explicit column name — it defeats the mapping and
  the two sides drift apart.
- **Timestamps** are always `withTimezone: true`. A run can be parked for days
  awaiting an approval; a naive timestamp will be read back wrong.
- **Indexes follow the queries.** Every index that supports a list query leads
  with the column that query filters on. The run list is read far more often
  than it is written; design for the read.
- **Names** are snake_case plural for tables (`run_events`), and indexes are
  `<table>_<columns>_idx`.

### 2. Respect the journal's rules

`run_events` and anything else on the durable path is **append-only**. No
`UPDATE`, no `DELETE`, no mutable status column that gets rewritten in place —
state is derived by folding the events.

Every journaled event carries a unique constraint on `(runId, stepKey)`:

```ts
(table) => [unique('run_events_run_step_uq').on(table.runId, table.stepKey)],
```

This is what makes a retried turn safe. A crashed turn is retried by the queue,
and the insert conflicting is how the runtime knows to re-read the recorded
result instead of paying for the LLM call or the tool side effect twice. A table
on the durable path without this constraint is a bug, even if nothing fails yet.

### 3. Generate the migration

```
npm run db:generate
```

This writes SQL into `drizzle/`. **Read the generated file before committing it.**
Watch for: a column added `NOT NULL` without a default against a non-empty table,
an unintended table drop where you meant a rename, and index creation that will
lock a large table.

**Never hand-edit files in `drizzle/`.** They are generated and are the record of
what has already been applied. If the SQL is wrong, fix `schema.ts` and
regenerate. If a migration was already applied and needs changing, write a new
migration forward — never rewrite history.

### 4. Apply it

```
npm run infra:up
npm run db:migrate
```

`infra:up` starts Postgres and Redis, and is a no-op if they are already running.

`npm run db:push` skips the migration file and pushes the schema directly. It is
for throwaway local experiments only — never for anything committed, and never
against a shared database.

`npm run db:studio` opens a browser UI to inspect the result.

### 5. Query it

Inject the typed client rather than reaching for the pool:

```ts
constructor(@Inject(DRIZZLE) private readonly db: Database) {}
```

`Database` is `NodePgDatabase<typeof schema>`, so `db.query.runs` is typed from
the table you just defined. Use `PG_POOL` only when you need raw `pg` behaviour
the query builder can't express.

## Verify

```
npm run build && npm test
```

Plus: run `npm run db:generate` a second time. It must report **"No schema
changes"** — if it generates another migration, your schema and the generated SQL
disagree and the first migration was incomplete.

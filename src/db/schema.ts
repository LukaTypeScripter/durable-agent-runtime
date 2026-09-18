import {
  pgSchema,
  uuid,
  text,
  pgEnum,
  timestamp,
  varchar,
  index,
  integer,
  jsonb
} from 'drizzle-orm/pg-core';


export const agentSchema = pgSchema('agent_schema');

export const modelEnum = pgEnum('model', [
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'claude-opus-4-5',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
  'claude-sonnet-5',
  'claude-opus-5',
  'claude-fable-5-1',
]);

export const statusEnum = pgEnum('status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const runs = agentSchema.table(
  'runs',
  {
    id: uuid().primaryKey().defaultRandom(),
    goal: text(),
    model: modelEnum().notNull(),
    status: statusEnum().notNull().default('pending'),
    failReason: varchar({ length: 64 }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('runs_status_created_status').on(table.createdAt, table.status),
  ],
);

export const runEvents = agentSchema.table(
  'run_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    runId: uuid().notNull().references(() => runs.id),
    workerData: varchar({ length: 128 }),
    sequence: integer().notNull(),
    stepKey: text().notNull(),
    type: varchar({ length: 32 }).notNull(),
    payload: jsonb().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
);

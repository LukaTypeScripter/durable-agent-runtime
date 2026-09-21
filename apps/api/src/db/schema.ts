import { CLAUDE_MODELS } from '@dar/contracts';
import {
  pgSchema,
  uuid,
  text,
  pgEnum,
  timestamp,
  varchar,
  index,
  integer,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

export const agentSchema = pgSchema('agent_schema');

export const modelEnum = pgEnum('model', CLAUDE_MODELS);

export const statusEnum = pgEnum('status', [
  'pending',
  'running',
  'awaiting_approval',
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
    claimedAt: timestamp({ withTimezone: true }),
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
    runId: uuid()
      .notNull()
      .references(() => runs.id),
    workerData: varchar({ length: 128 }),
    sequence: integer().notNull(),
    stepKey: text().notNull(),
    type: varchar({ length: 32 }).notNull(),
    payload: jsonb().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('run_events_run_step_uq').on(table.runId, table.stepKey),
    unique('run_events_run_sequence_uq').on(table.runId, table.sequence),
  ],
);

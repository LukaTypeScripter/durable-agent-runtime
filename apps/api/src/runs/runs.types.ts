import type { runEvents, runs } from '../db/schema.js';
import type { StepKey } from './step-key.js';

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type RunStatus = Run['status'];
export type RunEvent = typeof runEvents.$inferSelect;

export interface NewRunEvent {
  runId: string;
  stepKey: StepKey;
  type: string;
  payload: unknown;
}

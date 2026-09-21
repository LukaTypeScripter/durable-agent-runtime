import { z } from 'zod';
import { CLAUDE_MODELS, RUN_STATUSES } from './models.js';

export const createRunSchema = z.object({
  goal: z.string().min(1).max(255),
  model: z.enum(CLAUDE_MODELS),
});

export type CreateRunDto = z.infer<typeof createRunSchema>;

export const decideApprovalSchema = z.object({
  approved: z.boolean(),
  decidedBy: z.string().min(1).max(128).optional(),
});

export type DecideApprovalDto = z.infer<typeof decideApprovalSchema>;

export interface RunResponse {
  id: string;
  goal: string | null;
  model: (typeof CLAUDE_MODELS)[number];
  status: (typeof RUN_STATUSES)[number];
  failReason: string | null;
  claimedAt: string | null;
  claimedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export const listRunsQuerySchema = z.object({
  status: z.enum(RUN_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListRunsQuery = z.infer<typeof listRunsQuerySchema>;

export interface RunEventResponse {
  id: string;
  runId: string;
  sequence: number;
  stepKey: string;
  type: string;
  payload: unknown;
  createdAt: string;
}

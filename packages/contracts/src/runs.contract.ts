import { z } from 'zod';
import { CLAUDE_MODELS } from './models.js';

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

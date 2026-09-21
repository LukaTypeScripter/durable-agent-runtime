import { z } from 'zod';

export const decideApprovalSchema = z.object({
  approved: z.boolean(),
  decidedBy: z.string().min(1).max(128).optional(),
});

export type DecideApprovalDto = z.infer<typeof decideApprovalSchema>;

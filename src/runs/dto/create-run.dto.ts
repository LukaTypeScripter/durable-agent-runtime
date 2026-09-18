import { z } from 'zod';
import { modelEnum } from '../../db/schema.js';

export const createRunSchema = z.object({
  goal: z.string().min(1).max(255),
  model: z.enum(modelEnum.enumValues),
});

export type CreateRunDto = z.infer<typeof createRunSchema>;

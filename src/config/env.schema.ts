import { z } from 'zod';
import { modelEnum } from '../db/schema.js';

const booleanish = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .transform((value) => value === 'true' || value === '1' || value === 'yes');

const urlString = z
  .string()
  .min(1)
  .refine((value) => URL.canParse(value), { message: 'must be a valid URL' });

const durationMs = z.coerce.number().int().positive();

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  PUBLIC_BASE_URL: urlString.default('http://localhost:3000'),

  DATABASE_URL: urlString,
  DATABASE_SSL: booleanish.default(false),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_STATEMENT_TIMEOUT_MS: durationMs.default(30_000),

  REDIS_URL: urlString.default('redis://localhost:6379'),
  QUEUE_PREFIX: z.string().min(1).default('dar'),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(8),
  TURN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  TURN_BACKOFF_MS: durationMs.default(2_000),

  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_DEFAULT_MODEL: z
    .enum(modelEnum.enumValues)
    .default('claude-sonnet-5'),
  LLM_REQUEST_TIMEOUT_MS: durationMs.default(120_000),
  LLM_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),

  RUN_MAX_TURNS: z.coerce.number().int().positive().default(25),
  RUN_MAX_TOOL_CALLS: z.coerce.number().int().positive().default(100),
  RUN_MAX_TOKENS: z.coerce.number().int().positive().default(400_000),
  RUN_MAX_COST_USD: z.coerce.number().positive().default(4),
  RUN_MAX_DURATION_MS: durationMs.default(86_400_000),
  RUN_APPROVAL_TIMEOUT_MS: durationMs.default(604_800_000),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const present = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== ''),
  );

  const result = envSchema.safeParse(present);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => {
        const path = issue.path.join('.');
        return path ? `  ${path}: ${issue.message}` : `  ${issue.message}`;
      })
      .join('\n');

    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return result.data;
}

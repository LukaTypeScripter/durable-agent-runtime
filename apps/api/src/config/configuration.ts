import type { Env } from './env.schema.js';

export function buildConfig(env: Env) {
  return {
    app: {
      env: env.NODE_ENV,
      isProduction: env.NODE_ENV === 'production',
      port: env.PORT,
      logLevel: env.LOG_LEVEL,
      publicBaseUrl: env.PUBLIC_BASE_URL,
    },
    database: {
      url: env.DATABASE_URL,
      ssl: env.DATABASE_SSL,
      poolMax: env.DATABASE_POOL_MAX,
      statementTimeoutMs: env.DATABASE_STATEMENT_TIMEOUT_MS,
    },
    redis: {
      url: env.REDIS_URL,
      queuePrefix: env.QUEUE_PREFIX,
      workerConcurrency: env.WORKER_CONCURRENCY,
      turnMaxAttempts: env.TURN_MAX_ATTEMPTS,
      turnBackoffMs: env.TURN_BACKOFF_MS,
      turnLeaseMs: env.TURN_LEASE_MS,
    },
    llm: {
      requestTimeoutMs: env.LLM_REQUEST_TIMEOUT_MS,
      maxRetries: env.LLM_MAX_RETRIES,
      anthropic: {
        apiKey: env.ANTHROPIC_API_KEY,
        workspaceId: env.ANTHROPIC_WORKSPACE_ID,
        defaultModel: env.ANTHROPIC_DEFAULT_MODEL,
      },
    },
    budgets: {
      maxTurns: env.RUN_MAX_TURNS,
      maxToolCalls: env.RUN_MAX_TOOL_CALLS,
      maxTokens: env.RUN_MAX_TOKENS,
      maxCostUsd: env.RUN_MAX_COST_USD,
      maxDurationMs: env.RUN_MAX_DURATION_MS,
      approvalTimeoutMs: env.RUN_APPROVAL_TIMEOUT_MS,
    },
  };
}

export type AppConfig = ReturnType<typeof buildConfig>;

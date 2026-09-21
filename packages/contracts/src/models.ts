export const CLAUDE_MODELS = [
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'claude-opus-4-5',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
  'claude-sonnet-5',
  'claude-opus-5',
  'claude-fable-5-1',
] as const;

export type Model = (typeof CLAUDE_MODELS)[number];

export const RUN_STATUSES = [
  'pending',
  'running',
  'awaiting_approval',
  'completed',
  'failed',
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

export const RUNS_QUEUE = 'runs';

export const TURN_JOB = 'turn';

export interface TurnJobData {
  runId: string;
  stepKey: string;
}

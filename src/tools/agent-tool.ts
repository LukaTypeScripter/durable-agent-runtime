import type { ZodType } from 'zod';

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: ZodType;
  readonly requiresApproval?: boolean;
  execute(input: unknown): Promise<unknown>;
}

export interface ToolOutcome {
  content: string;
  isError: boolean;
}

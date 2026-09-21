import { Injectable } from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { AgentTool, ToolOutcome } from './agent-tool.js';

@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  definitions(): Anthropic.Tool[] {
    return [...this.tools.values()].map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: z.toJSONSchema(tool.inputSchema) as Anthropic.Tool.InputSchema,
    }));
  }

  async execute(name: string, input: unknown): Promise<ToolOutcome> {
    const tool = this.tools.get(name);

    if (tool === undefined) {
      return { content: `No tool named ${name} is registered`, isError: true };
    }

    const parsed = tool.inputSchema.safeParse(input);

    if (!parsed.success) {
      return {
        content: parsed.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; '),
        isError: true,
      };
    }

    try {
      return { content: JSON.stringify(await tool.execute(parsed.data)), isError: false };
    } catch (error) {
      return {
        content: error instanceof Error ? error.message : 'the tool failed',
        isError: true,
      };
    }
  }
}

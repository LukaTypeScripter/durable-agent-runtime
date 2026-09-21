import type Anthropic from '@anthropic-ai/sdk';
import type { RunEvent } from './runs.repository.js';

export const RUN_CREATED = 'run_created';
export const LLM_RESPONSE = 'llm_response';
export const TOOL_RESULT = 'tool_result';
export const TOOL_RESULTS = 'tool_results';

export function foldConversation(
  events: RunEvent[],
): Anthropic.MessageParam[] {
  const ordered = [...events].sort((a, b) => a.sequence - b.sequence);
  const messages: Anthropic.MessageParam[] = [];

  for (const event of ordered) {
    if (event.type === RUN_CREATED) {
      const { goal } = event.payload as { goal?: string };

      if (goal !== undefined && goal !== '') {
        messages.push({ role: 'user', content: goal });
      }
    }

    if (event.type === LLM_RESPONSE) {
      const response = event.payload as Anthropic.Message;
      messages.push({ role: 'assistant', content: response.content });
    }

    if (event.type === TOOL_RESULTS) {
      const results = event.payload as Anthropic.ToolResultBlockParam[];
      messages.push({ role: 'user', content: results });
    }
  }

  return messages;
}

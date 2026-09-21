import {
  LLM_RESPONSE,
  RUN_CREATED,
  TOOL_RESULTS,
  foldConversation,
} from './conversation.js';
import type { RunEvent } from './runs.repository.js';

const event = (
  sequence: number,
  type: string,
  payload: unknown,
): RunEvent =>
  ({
    id: `event-${sequence}`,
    runId: 'run-1',
    workerData: null,
    sequence,
    stepKey: `step-${sequence}`,
    type,
    payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as RunEvent;

describe('foldConversation', () => {
  it('starts the conversation with the goal', () => {
    const messages = foldConversation([
      event(1, RUN_CREATED, { goal: 'summarise the report' }),
    ]);

    expect(messages).toEqual([
      { role: 'user', content: 'summarise the report' },
    ]);
  });

  it('replays an assistant turn with its content blocks', () => {
    const content = [{ type: 'text', text: 'here is the summary' }];

    const messages = foldConversation([
      event(1, RUN_CREATED, { goal: 'summarise' }),
      event(2, LLM_RESPONSE, { content }),
    ]);

    expect(messages[1]).toEqual({ role: 'assistant', content });
  });

  it('returns tool results as a single user message', () => {
    const results = [
      { type: 'tool_result', tool_use_id: 'a', content: 'first' },
      { type: 'tool_result', tool_use_id: 'b', content: 'second' },
    ];

    const messages = foldConversation([
      event(1, RUN_CREATED, { goal: 'do things' }),
      event(2, LLM_RESPONSE, { content: [] }),
      event(3, TOOL_RESULTS, results),
    ]);

    expect(messages).toHaveLength(3);
    expect(messages[2]).toEqual({ role: 'user', content: results });
  });

  it('rebuilds the order from the sequence, not the array', () => {
    const messages = foldConversation([
      event(3, LLM_RESPONSE, { content: 'second turn' }),
      event(1, RUN_CREATED, { goal: 'the goal' }),
      event(2, LLM_RESPONSE, { content: 'first turn' }),
    ]);

    expect(messages.map((message) => message.content)).toEqual([
      'the goal',
      'first turn',
      'second turn',
    ]);
  });

  it('ignores events that carry no conversation content', () => {
    const messages = foldConversation([
      event(1, RUN_CREATED, { goal: 'the goal' }),
      event(2, 'turn_started', {}),
    ]);

    expect(messages).toHaveLength(1);
  });

  it('is empty when the run was created without a goal', () => {
    expect(foldConversation([event(1, RUN_CREATED, {})])).toEqual([]);
  });
});

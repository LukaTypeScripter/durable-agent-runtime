import { summariseEvent } from './event-summary';
import type { RunEventResponse } from '@dar/contracts';

const event = (type: string, payload: unknown): RunEventResponse =>
  ({
    id: 'e1',
    runId: 'r1',
    sequence: 1,
    stepKey: 'turn:1:llm',
    type,
    payload,
    createdAt: '2026-01-01T00:00:00Z',
  }) as RunEventResponse;

describe('summariseEvent', () => {
  it('shows the goal a run started from', () => {
    expect(summariseEvent(event('run_created', { goal: 'Summarise it' }))).toBe(
      'Summarise it',
    );
  });

  it('shows what the model said', () => {
    const payload = {
      content: [
        { type: 'text', text: 'The report describes an outage.' },
        { type: 'text', text: '  ' },
      ],
    };

    expect(summariseEvent(event('llm_response', payload))).toBe(
      'The report describes an outage.',
    );
  });

  it('shows the tools the model asked for', () => {
    const payload = {
      content: [
        { type: 'text', text: 'Let me look.' },
        { type: 'tool_use', name: 'fetch_report', input: { id: '7' } },
      ],
    };

    expect(summariseEvent(event('llm_response', payload))).toBe(
      'Let me look.\n\nfetch_report({"id":"7"})',
    );
  });

  it('shows what a tool returned', () => {
    expect(
      summariseEvent(event('tool_result', { content: 'report text' })),
    ).toBe('report text');
  });

  it('shows what a reviewer decided', () => {
    expect(summariseEvent(event('approval_decided', { approved: false }))).toBe(
      'Declined',
    );
  });

  it('says nothing about steps that carry no readable content', () => {
    expect(summariseEvent(event('turn_started', {}))).toBeNull();
    expect(summariseEvent(event('llm_response', { content: [] }))).toBeNull();
  });
});

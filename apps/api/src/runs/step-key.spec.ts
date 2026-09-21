import {
  approvalStep,
  llmCallStep,
  toolCallStep,
  turnStep,
} from './step-key.js';

describe('step keys', () => {
  it('names each kind of step distinctly', () => {
    expect(turnStep(1)).toBe('turn:1');
    expect(llmCallStep(1)).toBe('turn:1:llm');
    expect(toolCallStep(1, 0)).toBe('turn:1:tool:0');
    expect(approvalStep(1, 0)).toBe('turn:1:tool:0:approval');
  });

  it('returns the same key for the same step so a retry deduplicates', () => {
    expect(toolCallStep(3, 2)).toBe(toolCallStep(3, 2));
  });

  it('separates steps that must not share a journal row', () => {
    const keys = new Set([
      turnStep(1),
      turnStep(2),
      llmCallStep(1),
      toolCallStep(1, 0),
      toolCallStep(1, 1),
      approvalStep(1, 0),
    ]);

    expect(keys.size).toBe(6);
  });
});

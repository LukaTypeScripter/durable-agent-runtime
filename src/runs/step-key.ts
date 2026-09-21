declare const stepKeyBrand: unique symbol;

export type StepKey = string & { readonly [stepKeyBrand]: true };

const key = (value: string): StepKey => value as StepKey;

export function turnStep(turn: number): StepKey {
  return key(`turn:${turn}`);
}

export function llmCallStep(turn: number): StepKey {
  return key(`turn:${turn}:llm`);
}

export function toolCallStep(turn: number, index: number): StepKey {
  return key(`turn:${turn}:tool:${index}`);
}

export function approvalStep(turn: number, index: number): StepKey {
  return key(`turn:${turn}:tool:${index}:approval`);
}

export function approvalDecisionStep(turn: number, index: number): StepKey {
  return key(`turn:${turn}:tool:${index}:approval:decision`);
}

export function toolResultsStep(turn: number): StepKey {
  return key(`turn:${turn}:tool-results`);
}

export function runCreatedStep(): StepKey {
  return key('run:created');
}

export const FIRST_TURN = 1;

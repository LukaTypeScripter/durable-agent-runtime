import type { RunEventResponse } from '@dar/contracts';

interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  name: string;
  input: unknown;
}

function blocks(payload: Record<string, unknown>): unknown[] {
  return Array.isArray(payload['content']) ? payload['content'] : [];
}

function isTextBlock(block: unknown): block is TextBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as TextBlock).type === 'text' &&
    typeof (block as TextBlock).text === 'string'
  );
}

function isToolUseBlock(block: unknown): block is ToolUseBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as ToolUseBlock).type === 'tool_use' &&
    typeof (block as ToolUseBlock).name === 'string'
  );
}

function describeCall(name: string, input: unknown): string {
  return `${name}(${JSON.stringify(input ?? {})})`;
}

export function summariseEvent(event: RunEventResponse): string | null {
  const payload = event.payload;

  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const fields = payload as Record<string, unknown>;

  if (event.type === 'run_created') {
    return typeof fields['goal'] === 'string' ? fields['goal'] : null;
  }

  if (event.type === 'llm_response') {
    const said = blocks(fields)
      .filter(isTextBlock)
      .map((block) => block.text.trim())
      .filter((text) => text.length > 0)
      .join('\n\n');

    const asked = blocks(fields)
      .filter(isToolUseBlock)
      .map((block) => describeCall(block.name, block.input))
      .join('\n');

    return [said, asked].filter((part) => part.length > 0).join('\n\n') || null;
  }

  if (event.type === 'tool_result') {
    return typeof fields['content'] === 'string' ? fields['content'] : null;
  }

  if (event.type === 'approval_requested') {
    return typeof fields['toolName'] === 'string'
      ? describeCall(fields['toolName'], fields['input'])
      : null;
  }

  if (event.type === 'approval_decided') {
    return fields['approved'] === true ? 'Approved' : 'Declined';
  }

  return null;
}

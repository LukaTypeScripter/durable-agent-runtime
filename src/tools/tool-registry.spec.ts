import { z } from 'zod';
import { ToolRegistry } from './tool-registry.js';
import type { AgentTool } from './agent-tool.js';

const fetchReport: AgentTool = {
  name: 'fetch_report',
  description: 'Fetch an incident report by id',
  inputSchema: z.object({ id: z.string() }),
  execute: (input) => Promise.resolve({ report: `report ${(input as { id: string }).id}` }),
};

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    registry.register(fetchReport);
  });

  it('describes registered tools for the model', () => {
    const [definition] = registry.definitions();

    expect(definition.name).toBe('fetch_report');
    expect(definition.description).toBe('Fetch an incident report by id');
    expect(definition.input_schema).toMatchObject({
      type: 'object',
      properties: { id: { type: 'string' } },
    });
  });

  it('returns the tool output as serialised content', async () => {
    const outcome = await registry.execute('fetch_report', { id: '7' });

    expect(outcome).toEqual({
      content: JSON.stringify({ report: 'report 7' }),
      isError: false,
    });
  });

  it('reports an unknown tool back to the model instead of throwing', async () => {
    const outcome = await registry.execute('nonexistent', {});

    expect(outcome.isError).toBe(true);
    expect(outcome.content).toContain('nonexistent');
  });

  it('rejects arguments that do not match the schema', async () => {
    const outcome = await registry.execute('fetch_report', { id: 42 });

    expect(outcome.isError).toBe(true);
    expect(outcome.content).toContain('id');
  });

  it('turns a thrown tool error into an error result', async () => {
    registry.register({
      ...fetchReport,
      name: 'broken',
      execute: () => Promise.reject(new Error('upstream is down')),
    });

    const outcome = await registry.execute('broken', { id: '1' });

    expect(outcome).toEqual({ content: 'upstream is down', isError: true });
  });
});

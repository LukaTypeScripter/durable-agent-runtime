import { ConfigService } from '@nestjs/config';
import { UnrecoverableError } from 'bullmq';
import type { Job, Worker } from 'bullmq';
import { TurnProcessor } from './turn.processor.js';
import { RunsRepository } from './runs.repository.js';
import type { Run } from './runs.types.js';
import { RunsQueue } from './runs.queue.js';
import { LlmService } from '../llm/llm.service.js';
import type { LlmResponse } from '../llm/llm.service.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import {
  approvalDecisionStep,
  approvalStep,
  llmCallStep,
  toolCallStep,
  toolResultsStep,
  turnStep,
} from './step-key.js';
import type { TurnJobData } from '../queue/queue.constants.js';

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

describe('TurnProcessor', () => {
  let maxTurns = 25;

  const config = {
    get: (path: string) => (path === 'budgets.maxTurns' ? maxTurns : 8),
  } as unknown as ConfigService<never, true>;

  const run: Run = {
    id: '00000000-0000-4000-8000-000000000001',
    goal: 'summarise the incident report',
    model: 'claude-haiku-4-5',
    status: 'running',
    failReason: null,
    claimedAt: new Date('2026-01-01T00:00:00Z'),
    claimedBy: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const answered = {
    id: 'msg_01',
    model: run.model,
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: 'the report says ...' }],
  } as unknown as LlmResponse;

  const toolRequested = {
    ...answered,
    stop_reason: 'tool_use',
    content: [
      { type: 'tool_use', id: 'toolu_1', name: 'fetch_report', input: { id: '7' } },
    ],
  } as unknown as LlmResponse;

  const jobAfter = (attemptsMade: number) =>
    ({
      id: 'job-1',
      data: { runId: run.id, turn: 1, stepKey: turnStep(1) },
      opts: { attempts: 5 },
      attemptsMade,
    }) as Job<TurnJobData>;

  const job = jobAfter(0);

  let repository: Mocked<RunsRepository>;
  let llm: Mocked<LlmService>;
  let tools: Mocked<ToolRegistry>;
  let queue: Mocked<RunsQueue>;
  let processor: TurnProcessor;

  beforeEach(() => {
    maxTurns = 25;

    repository = {
      findById: vi.fn(),
      claimForTurn: vi.fn().mockResolvedValue(run),
      createWithFirstEvent: vi.fn(),
      findEventByStepKey: vi.fn().mockResolvedValue(null),
      findMany: vi.fn(),
      findEventsByRun: vi
        .fn()
        .mockResolvedValue([
          { sequence: 1, type: 'run_created', payload: { goal: run.goal } },
        ]),
      appendEvent: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      markAwaitingApproval: vi.fn(),
      markPending: vi.fn(),
      findLatestEventByType: vi.fn(),
    };
    llm = { respond: vi.fn().mockResolvedValue(answered) };
    tools = {
      register: vi.fn(),
      definitions: vi.fn().mockReturnValue([]),
      requiresApproval: vi.fn().mockReturnValue(false),
      execute: vi.fn().mockResolvedValue({ content: '"the report"', isError: false }),
    };
    queue = { enqueueTurn: vi.fn(), resumeTurn: vi.fn() };

    processor = new TurnProcessor(
      config,
      repository as never,
      llm as never,
      tools as never,
      queue as never,
    );
  });

  it('applies the configured concurrency to the worker', () => {
    const worker = { concurrency: 1 } as Worker;
    Object.assign(processor, { _worker: worker });

    processor.onApplicationBootstrap();

    expect(worker.concurrency).toBe(8);
  });

  it('gives up without retrying when the run does not exist', async () => {
    repository.claimForTurn.mockResolvedValue(null);
    repository.findById.mockResolvedValue(null);

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it('ignores a duplicate job for a finished run', async () => {
    repository.claimForTurn.mockResolvedValue(null);
    repository.findById.mockResolvedValue({ ...run, status: 'completed' });

    await expect(processor.process(job)).resolves.toBeUndefined();
  });

  it('calls the model with the folded conversation and journals the reply', async () => {
    await processor.process(job);

    expect(llm.respond).toHaveBeenCalledWith(
      run.model,
      [{ role: 'user', content: run.goal }],
      [],
    );
    expect(repository.appendEvent).toHaveBeenCalledWith({
      runId: run.id,
      stepKey: llmCallStep(1),
      type: 'llm_response',
      payload: answered,
    });
  });

  it('replays a recorded response instead of calling the model again', async () => {
    repository.findEventByStepKey.mockResolvedValue({ payload: answered });

    await processor.process(job);

    expect(llm.respond).not.toHaveBeenCalled();
  });

  it('completes the run when the model finishes its turn', async () => {
    await processor.process(job);

    expect(repository.markCompleted).toHaveBeenCalledWith(run.id);
  });

  it('fails the run when the reply was truncated', async () => {
    llm.respond.mockResolvedValue({ ...answered, stop_reason: 'max_tokens' });

    await processor.process(job);

    expect(repository.markFailed).toHaveBeenCalledWith(run.id, 'max_tokens');
    expect(repository.markCompleted).not.toHaveBeenCalled();
  });

  it('fails the run when the model refuses', async () => {
    llm.respond.mockResolvedValue({ ...answered, stop_reason: 'refusal' });

    await processor.process(job);

    expect(repository.markFailed).toHaveBeenCalledWith(run.id, 'refusal');
  });

  it('runs each requested tool and journals its result', async () => {
    llm.respond.mockResolvedValue(toolRequested);

    await processor.process(job);

    expect(tools.execute).toHaveBeenCalledWith('fetch_report', { id: '7' });
    expect(repository.appendEvent).toHaveBeenCalledWith({
      runId: run.id,
      stepKey: toolCallStep(1, 0),
      type: 'tool_result',
      payload: {
        type: 'tool_result',
        tool_use_id: 'toolu_1',
        content: '"the report"',
        is_error: false,
      },
    });
  });

  it('replays a recorded tool result instead of running the tool again', async () => {
    llm.respond.mockResolvedValue(toolRequested);
    repository.findEventByStepKey.mockImplementation((_id: string, key: string) =>
      Promise.resolve(
        key === toolCallStep(1, 0)
          ? { payload: { type: 'tool_result', tool_use_id: 'toolu_1' } }
          : null,
      ),
    );

    await processor.process(job);

    expect(tools.execute).not.toHaveBeenCalled();
  });

  it('collects the results into one message and enqueues the next turn', async () => {
    llm.respond.mockResolvedValue(toolRequested);

    await processor.process(job);

    expect(repository.appendEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stepKey: toolResultsStep(1),
        type: 'tool_results',
      }),
    );
    expect(queue.enqueueTurn).toHaveBeenCalledWith({
      runId: run.id,
      turn: 2,
      stepKey: turnStep(2),
    });
    expect(repository.markCompleted).not.toHaveBeenCalled();
  });

  describe('when a tool needs approval', () => {
    beforeEach(() => {
      llm.respond.mockResolvedValue(toolRequested);
      tools.requiresApproval.mockReturnValue(true);
    });

    it('parks the run without running the tool or holding a job', async () => {
      await processor.process(job);

      expect(tools.execute).not.toHaveBeenCalled();
      expect(repository.markAwaitingApproval).toHaveBeenCalledWith(run.id);
      expect(queue.enqueueTurn).not.toHaveBeenCalled();
    });

    it('records what is waiting on a reviewer', async () => {
      await processor.process(job);

      expect(repository.appendEvent).toHaveBeenCalledWith({
        runId: run.id,
        stepKey: approvalStep(1, 0),
        type: 'approval_requested',
        payload: {
          turn: 1,
          index: 0,
          toolName: 'fetch_report',
          input: { id: '7' },
        },
      });
    });

    it('runs the tool once a reviewer has approved', async () => {
      repository.findEventByStepKey.mockImplementation((_id: string, key: string) =>
        Promise.resolve(
          key === approvalDecisionStep(1, 0)
            ? { payload: { approved: true } }
            : null,
        ),
      );

      await processor.process(job);

      expect(tools.execute).toHaveBeenCalledWith('fetch_report', { id: '7' });
      expect(queue.enqueueTurn).toHaveBeenCalled();
    });

    it('tells the model when a reviewer declined, without running the tool', async () => {
      repository.findEventByStepKey.mockImplementation((_id: string, key: string) =>
        Promise.resolve(
          key === approvalDecisionStep(1, 0)
            ? { payload: { approved: false } }
            : null,
        ),
      );

      await processor.process(job);

      expect(tools.execute).not.toHaveBeenCalled();
      expect(repository.appendEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          stepKey: toolCallStep(1, 0),
          payload: expect.objectContaining({ is_error: true }),
        }),
      );
      expect(queue.enqueueTurn).toHaveBeenCalled();
    });
  });

  describe('when the job finally fails', () => {
    it('leaves the run alone while retries remain', async () => {
      await processor.onFailed(jobAfter(2), new Error('boom'));

      expect(repository.markFailed).not.toHaveBeenCalled();
    });

    it('records the failure once the attempts are spent', async () => {
      await processor.onFailed(jobAfter(5), new Error('boom'));

      expect(repository.markFailed).toHaveBeenCalledWith(run.id, 'boom');
    });

    it('records an unrecoverable failure immediately', async () => {
      await processor.onFailed(job, new UnrecoverableError('gone'));

      expect(repository.markFailed).toHaveBeenCalledWith(run.id, 'gone');
    });
  });

  it('stops the run instead of enqueueing past the turn budget', async () => {
    maxTurns = 1;
    llm.respond.mockResolvedValue(toolRequested);

    await processor.process(job);

    expect(queue.enqueueTurn).not.toHaveBeenCalled();
    expect(repository.markFailed).toHaveBeenCalledWith(
      run.id,
      'turn_budget_exhausted',
    );
  });
});

import { NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnrecoverableError } from 'bullmq';
import type { Job, Worker } from 'bullmq';
import { TurnProcessor } from './turn.processor.js';
import { RunsRepository } from './runs.repository.js';
import type { Run } from './runs.repository.js';
import { turnStep } from './step-key.js';
import type { TurnJobData } from '../queue/queue.constants.js';

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

describe('TurnProcessor', () => {
  const config = { get: () => 8 } as unknown as ConfigService<never, true>;

  const run: Run = {
    id: '00000000-0000-4000-8000-000000000001',
    goal: 'summarise the incident report',
    model: 'claude-haiku-4-5',
    status: 'pending',
    failReason: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    claimedAt: null,
  };

  const job = {
    data: { runId: run.id, stepKey: turnStep(1) },
  } as Job<TurnJobData>;

  let repository: Mocked<RunsRepository>;
  let processor: TurnProcessor;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      claimForTurn: vi.fn(),
      createWithFirstEvent: vi.fn(),
    };
    processor = new TurnProcessor(config, repository as never);
  });

  it('applies the configured concurrency to the worker', () => {
    const worker = { concurrency: 1 } as Worker;
    Object.assign(processor, { _worker: worker });

    processor.onApplicationBootstrap();

    expect(worker.concurrency).toBe(8);
  });

  it('claims the run before doing any work', async () => {
    repository.claimForTurn.mockResolvedValue({ ...run, status: 'running' });

    await expect(processor.process(job)).rejects.toBeInstanceOf(
      NotImplementedException,
    );
    expect(repository.claimForTurn).toHaveBeenCalledWith(run.id);
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

  it('ignores a run another worker still holds', async () => {
    repository.claimForTurn.mockResolvedValue(null);
    repository.findById.mockResolvedValue({
      ...run,
      status: 'running',
      claimedAt: new Date(),
    });

    await expect(processor.process(job)).resolves.toBeUndefined();
  });
});

import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { RunsRepository } from './runs.repository.js';
import type { Run } from './runs.types.js';
import { RunsService } from './runs.service.js';
import { RunsQueue } from './runs.queue.js';
import { turnStep } from './step-key.js';

type Mocked<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

describe('RunsService', () => {
  let service: RunsService;
  let repository: Mocked<RunsRepository>;
  let runsQueue: Mocked<RunsQueue>;

  const run: Run = {
    id: '00000000-0000-4000-8000-000000000001',
    goal: 'summarise the incident report',
    model: 'claude-haiku-4-5',
    status: 'pending',
    failReason: null,
    claimedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    repository = {
      findById: vi.fn(),
      claimForTurn: vi.fn(),
      createWithFirstEvent: vi.fn(),
      findEventByStepKey: vi.fn(),
      findEventsByRun: vi.fn(),
      appendEvent: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
      markAwaitingApproval: vi.fn(),
      markPending: vi.fn(),
      findLatestEventByType: vi.fn(),
    };
    runsQueue = { enqueueTurn: vi.fn(), resumeTurn: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunsService,
        { provide: RunsRepository, useValue: repository },
        { provide: RunsQueue, useValue: runsQueue },
      ],
    }).compile();

    service = module.get(RunsService);
  });

  it('persists the run with the requested model', async () => {
    repository.createWithFirstEvent.mockResolvedValue(run);

    await expect(
      service.create({ goal: 'a goal', model: 'claude-haiku-4-5' }),
    ).resolves.toBe(run);

    expect(repository.createWithFirstEvent).toHaveBeenCalledWith({
      goal: 'a goal',
      model: 'claude-haiku-4-5',
    });
  });

  it('enqueues the first turn of the new run', async () => {
    repository.createWithFirstEvent.mockResolvedValue(run);

    await service.create({ goal: 'a goal', model: 'claude-haiku-4-5' });

    expect(runsQueue.enqueueTurn).toHaveBeenCalledWith({
      runId: run.id,
      turn: 1,
      stepKey: turnStep(1),
    });
  });

  it('enqueues only after the run is committed', async () => {
    repository.createWithFirstEvent.mockResolvedValue(run);

    await service.create({ goal: 'a goal', model: 'claude-haiku-4-5' });

    expect(
      repository.createWithFirstEvent.mock.invocationCallOrder[0],
    ).toBeLessThan(runsQueue.enqueueTurn.mock.invocationCallOrder[0]);
  });

  it('does not enqueue when persistence fails', async () => {
    repository.createWithFirstEvent.mockRejectedValue(
      new Error('insert failed'),
    );

    await expect(
      service.create({ goal: 'a goal', model: 'claude-haiku-4-5' }),
    ).rejects.toThrow('insert failed');

    expect(runsQueue.enqueueTurn).not.toHaveBeenCalled();
  });

  it('returns the run when it exists', async () => {
    repository.findById.mockResolvedValue(run);

    await expect(service.findById(run.id)).resolves.toBe(run);
  });

  it('throws NotFound when the run is missing', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.findById(run.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { RunsRepository } from './runs.repository.js';
import type { Run } from './runs.repository.js';
import { RunsService } from './runs.service.js';

describe('RunsService', () => {
  let service: RunsService;
  let repository: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };

  const run: Run = {
    id: '00000000-0000-4000-8000-000000000001',
    goal: 'summarise the incident report',
    model: 'claude-haiku-4-5',
    status: 'pending',
    failReason: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    repository = { create: vi.fn(), findById: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RunsService,
        { provide: RunsRepository, useValue: repository },
        { provide: ConfigService, useValue: { get: () => 'claude-sonnet-5' } },
      ],
    }).compile();

    service = module.get(RunsService);
  });

  it('falls back to the configured model when none is requested', async () => {
    repository.create.mockResolvedValue(run);

    await expect(service.create({ goal: 'a goal' })).resolves.toBe(run);
    expect(repository.create).toHaveBeenCalledWith({
      goal: 'a goal',
      model: 'claude-sonnet-5',
    });
  });

  it('keeps an explicitly requested model', async () => {
    repository.create.mockResolvedValue(run);

    await service.create({ goal: 'a goal', model: 'claude-opus-5' });

    expect(repository.create).toHaveBeenCalledWith({
      goal: 'a goal',
      model: 'claude-opus-5',
    });
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

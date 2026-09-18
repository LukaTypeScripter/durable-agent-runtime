import { Injectable, NotFoundException } from '@nestjs/common';
import { RunsRepository } from './runs.repository.js';
import type { Run } from './runs.repository.js';
import type { CreateRunDto } from './dto/create-run.dto.js';
import { RunsQueue } from './runs.queue.js';
import { FIRST_TURN, turnStep } from './step-key.js';

@Injectable()
export class RunsService {
  constructor(
    private readonly repository: RunsRepository,
    private readonly runsQueue: RunsQueue,
  ) {}

  async create(dto: CreateRunDto): Promise<Run> {
    const run = await this.repository.createWithFirstEvent(dto);

    await this.runsQueue.enqueueTurn({
      runId: run.id,
      stepKey: turnStep(FIRST_TURN),
    });

    return run;
  }

  async findById(id: string): Promise<Run> {
    const run = await this.repository.findById(id);

    if (run === null) {
      throw new NotFoundException(`Run ${id} not found`);
    }

    return run;
  }
}

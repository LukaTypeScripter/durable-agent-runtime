import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { APPROVAL_DECIDED, APPROVAL_REQUESTED } from './conversation.js';
import { approvalDecisionStep } from './step-key.js';
import type { DecideApprovalDto } from './dto/decide-approval.dto.js';
import { RunsRepository } from './runs.repository.js';
import type { Run, RunEvent } from './runs.types.js';
import type { ListRunsQuery } from '@dar/contracts';
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
      turn: FIRST_TURN,
      stepKey: turnStep(FIRST_TURN),
    });

    return run;
  }

  async decideApproval(id: string, dto: DecideApprovalDto): Promise<Run> {
    const run = await this.findById(id);

    if (run.status !== 'awaiting_approval') {
      throw new ConflictException(`Run ${id} is not awaiting approval`);
    }

    const asked = await this.repository.findLatestEventByType(
      id,
      APPROVAL_REQUESTED,
    );

    if (asked === null) {
      throw new ConflictException(`Run ${id} has no pending approval`);
    }

    const { turn, index } = asked.payload as { turn: number; index: number };

    await this.repository.appendEvent({
      runId: id,
      stepKey: approvalDecisionStep(turn, index),
      type: APPROVAL_DECIDED,
      payload: { approved: dto.approved, decidedBy: dto.decidedBy ?? null },
    });

    await this.repository.markPending(id);

    await this.runsQueue.resumeTurn({
      runId: id,
      turn,
      stepKey: turnStep(turn),
    });

    return this.findById(id);
  }

  list(query: ListRunsQuery): Promise<Run[]> {
    return this.repository.findMany(query);
  }

  async events(id: string): Promise<RunEvent[]> {
    await this.findById(id);

    return this.repository.findEventsByRun(id);
  }

  async findById(id: string): Promise<Run> {
    const run = await this.repository.findById(id);

    if (run === null) {
      throw new NotFoundException(`Run ${id} not found`);
    }

    return run;
  }
}

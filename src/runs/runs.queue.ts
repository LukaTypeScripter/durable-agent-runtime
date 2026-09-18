import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RUNS_QUEUE, TURN_JOB } from '../queue/queue.constants.js';
import type { TurnJobData } from '../queue/queue.constants.js';

@Injectable()
export class RunsQueue {
  constructor(
    @InjectQueue(RUNS_QUEUE) private readonly queue: Queue<TurnJobData>,
  ) {}

  async enqueueTurn(data: TurnJobData): Promise<void> {
    await this.queue.add(TURN_JOB, data, {
      jobId: `${data.runId}:${data.stepKey}`,
    });
  }
}

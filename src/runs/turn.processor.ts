import { NotImplementedException } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { RUNS_QUEUE } from '../queue/queue.constants.js';
import type { TurnJobData } from '../queue/queue.constants.js';

@Processor(RUNS_QUEUE)
export class TurnProcessor extends WorkerHost {
  process(job: Job<TurnJobData>): Promise<void> {
    throw new NotImplementedException(
      `Turn ${job.data.stepKey} of run ${job.data.runId} has no executor yet`,
    );
  }
}

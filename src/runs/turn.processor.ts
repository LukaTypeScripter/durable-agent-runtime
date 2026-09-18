import { NotImplementedException } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import type { AppConfig } from '../config/configuration.js';
import { RUNS_QUEUE } from '../queue/queue.constants.js';
import type { TurnJobData } from '../queue/queue.constants.js';

@Processor(RUNS_QUEUE)
export class TurnProcessor
  extends WorkerHost
  implements OnApplicationBootstrap
{
  constructor(private readonly config: ConfigService<AppConfig, true>) {
    super();
  }

  onApplicationBootstrap(): void {
    this.worker.concurrency = this.config.get('redis.workerConcurrency', {
      infer: true,
    });
  }

  process(job: Job<TurnJobData>): Promise<void> {
    throw new NotImplementedException(
      `Turn ${job.data.stepKey} of run ${job.data.runId} has no executor yet`,
    );
  }
}

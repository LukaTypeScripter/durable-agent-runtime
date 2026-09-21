import { NotImplementedException } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError } from 'bullmq';
import type { AppConfig } from '../config/configuration.js';
import { RUNS_QUEUE } from '../queue/queue.constants.js';
import type { TurnJobData } from '../queue/queue.constants.js';
import { Run, RunsRepository } from './runs.repository.js';
import { StepKey } from './step-key.js';
import { LlmResponse } from '../llm/llm.service.js';
import { LlmService } from '../llm/llm.service.js';

const LLM_RESPONSE = 'llm_response';

@Processor(RUNS_QUEUE)
export class TurnProcessor
  extends WorkerHost
  implements OnApplicationBootstrap
{
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly repository: RunsRepository,
    private readonly llm: LlmService,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    this.worker.concurrency = this.config.get('redis.workerConcurrency', {
      infer: true,
    });
  }

  async process(job: Job<TurnJobData>): Promise<void> {
    const { runId, stepKey } = job.data;
    const claimedRun = await this.repository.claimForTurn(runId);

    if (claimedRun === null) {
      const existing = await this.repository.findById(runId);

      if (existing === null) {
        throw new UnrecoverableError(`Run ${runId} does not exist`);
      }

      return;
    }

    const response = await this.callModel(claimedRun, stepKey);

    if (response.stop_reason === 'tool_use') {
      throw new NotImplementedException(`Tool use is not supported yet`);
    }
  }

  private async callModel(run: Run, stepKey: StepKey): Promise<LlmResponse> {
    const recorded = await this.repository.findEventByStepKey(run.id, stepKey);

    if (recorded !== null) {
      return recorded.payload as LlmResponse;
    }

    if (run.goal === null) {
      throw new UnrecoverableError(`Run ${run.id} has no goal`);
    }

    const response = await this.llm.respond(run.model, run.goal);

    await this.repository.appendEvent({
      runId: run.id,
      stepKey,
      type: LLM_RESPONSE,
      payload: response,
    });

    return response;
  }
}

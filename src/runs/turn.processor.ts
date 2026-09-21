import type { OnApplicationBootstrap } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError } from 'bullmq';
import type Anthropic from '@anthropic-ai/sdk';
import type { AppConfig } from '../config/configuration.js';
import { RUNS_QUEUE } from '../queue/queue.constants.js';
import type { TurnJobData } from '../queue/queue.constants.js';
import { LlmService } from '../llm/llm.service.js';
import type { LlmResponse } from '../llm/llm.service.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { RunsQueue } from './runs.queue.js';
import { RunsRepository } from './runs.repository.js';
import type { Run } from './runs.repository.js';
import {
  LLM_RESPONSE,
  TOOL_RESULT,
  TOOL_RESULTS,
  foldConversation,
} from './conversation.js';
import { llmCallStep, toolCallStep, toolResultsStep, turnStep } from './step-key.js';
import type { StepKey } from './step-key.js';

@Processor(RUNS_QUEUE)
export class TurnProcessor
  extends WorkerHost
  implements OnApplicationBootstrap
{
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly repository: RunsRepository,
    private readonly llm: LlmService,
    private readonly tools: ToolRegistry,
    private readonly queue: RunsQueue,
  ) {
    super();
  }

  onApplicationBootstrap(): void {
    this.worker.concurrency = this.config.get('redis.workerConcurrency', {
      infer: true,
    });
  }

  async process(job: Job<TurnJobData>): Promise<void> {
    const { runId, turn } = job.data;
    const run = await this.repository.claimForTurn(runId);

    if (run === null) {
      const existing = await this.repository.findById(runId);

      if (existing === null) {
        throw new UnrecoverableError(`Run ${runId} does not exist`);
      }

      return;
    }

    const response = await this.callModel(run, llmCallStep(turn));

    if (response.stop_reason === 'tool_use') {
      await this.continueWithTools(run, turn, response);
      return;
    }

    if (response.stop_reason === 'max_tokens') {
      await this.repository.markFailed(run.id, 'max_tokens');
      return;
    }

    if (response.stop_reason === 'refusal') {
      await this.repository.markFailed(run.id, 'refusal');
      return;
    }

    await this.repository.markCompleted(run.id);
  }

  private async continueWithTools(
    run: Run,
    turn: number,
    response: LlmResponse,
  ): Promise<void> {
    const requests = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const [index, request] of requests.entries()) {
      results.push(await this.runTool(run, turn, index, request));
    }

    await this.repository.appendEvent({
      runId: run.id,
      stepKey: toolResultsStep(turn),
      type: TOOL_RESULTS,
      payload: results,
    });

    const maxTurns = this.config.get('budgets.maxTurns', { infer: true });

    if (turn >= maxTurns) {
      await this.repository.markFailed(run.id, 'turn_budget_exhausted');
      return;
    }

    await this.queue.enqueueTurn({
      runId: run.id,
      turn: turn + 1,
      stepKey: turnStep(turn + 1),
    });
  }

  private async runTool(
    run: Run,
    turn: number,
    index: number,
    request: Anthropic.ToolUseBlock,
  ): Promise<Anthropic.ToolResultBlockParam> {
    const stepKey = toolCallStep(turn, index);
    const recorded = await this.repository.findEventByStepKey(run.id, stepKey);

    if (recorded !== null) {
      return recorded.payload as Anthropic.ToolResultBlockParam;
    }

    const outcome = await this.tools.execute(request.name, request.input);

    const result: Anthropic.ToolResultBlockParam = {
      type: 'tool_result',
      tool_use_id: request.id,
      content: outcome.content,
      is_error: outcome.isError,
    };

    await this.repository.appendEvent({
      runId: run.id,
      stepKey,
      type: TOOL_RESULT,
      payload: result,
    });

    return result;
  }

  private async callModel(run: Run, stepKey: StepKey): Promise<LlmResponse> {
    const recorded = await this.repository.findEventByStepKey(run.id, stepKey);

    if (recorded !== null) {
      return recorded.payload as LlmResponse;
    }

    const messages = foldConversation(
      await this.repository.findEventsByRun(run.id),
    );

    if (messages.length === 0) {
      throw new UnrecoverableError(`Run ${run.id} has nothing to send`);
    }

    const response = await this.llm.respond(
      run.model,
      messages,
      this.tools.definitions(),
    );

    await this.repository.appendEvent({
      runId: run.id,
      stepKey,
      type: LLM_RESPONSE,
      payload: response,
    });

    return response;
  }
}

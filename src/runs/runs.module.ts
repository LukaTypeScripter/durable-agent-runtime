import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RUNS_QUEUE } from '../queue/queue.constants.js';
import { RunsController } from './runs.controller.js';
import { RunsQueue } from './runs.queue.js';
import { RunsRepository } from './runs.repository.js';
import { RunsService } from './runs.service.js';
import { TurnProcessor } from './turn.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: RUNS_QUEUE })],
  controllers: [RunsController],
  providers: [RunsService, RunsRepository, RunsQueue, TurnProcessor],
  exports: [RunsService],
})
export class RunsModule {}

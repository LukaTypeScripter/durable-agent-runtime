import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller.js';
import { RunsRepository } from './runs.repository.js';
import { RunsService } from './runs.service.js';

@Module({
  controllers: [RunsController],
  providers: [RunsService, RunsRepository],
  exports: [RunsService],
})
export class RunsModule {}

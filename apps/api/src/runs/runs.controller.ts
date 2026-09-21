import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { createRunSchema } from './dto/create-run.dto.js';
import type { CreateRunDto } from './dto/create-run.dto.js';
import { decideApprovalSchema } from './dto/decide-approval.dto.js';
import { listRunsQuerySchema } from '@dar/contracts';
import type { ListRunsQuery } from '@dar/contracts';
import type { DecideApprovalDto } from './dto/decide-approval.dto.js';
import { RunsService } from './runs.service.js';
import type { Run, RunEvent } from './runs.types.js';

@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createRunSchema)) dto: CreateRunDto,
  ): Promise<Run> {
    return this.runs.create(dto);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(listRunsQuerySchema)) query: ListRunsQuery,
  ): Promise<Run[]> {
    return this.runs.list(query);
  }

  @Get(':id/events')
  events(@Param('id', ParseUUIDPipe) id: string): Promise<RunEvent[]> {
    return this.runs.events(id);
  }

  @Post(':id/approval')
  decideApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(decideApprovalSchema)) dto: DecideApprovalDto,
  ): Promise<Run> {
    return this.runs.decideApproval(id, dto);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<Run> {
    return this.runs.findById(id);
  }
}

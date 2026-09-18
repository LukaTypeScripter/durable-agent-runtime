import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration.js';
import { RunsRepository } from './runs.repository.js';
import type { Run } from './runs.repository.js';
import type { CreateRunDto } from './dto/create-run.dto.js';

@Injectable()
export class RunsService {
  constructor(
    private readonly repository: RunsRepository,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  create(dto: CreateRunDto): Promise<Run> {
    return this.repository.create({
      goal: dto.goal,
      model:
        dto.model ??
        this.config.get('llm.anthropic.defaultModel', { infer: true }),
    });
  }

  async findById(id: string): Promise<Run> {
    const run = await this.repository.findById(id);

    if (run === null) {
      throw new NotFoundException(`Run ${id} not found`);
    }

    return run;
  }
}

import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { DRIZZLE } from '../db/drizzle.module.js';
import type { Database } from '../db/drizzle.module.js';
import { runs } from '../db/schema.js';

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

@Injectable()
export class RunsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  create(_input: NewRun): Promise<Run> {
    throw new NotImplementedException();
  }

  findById(_id: string): Promise<Run | null> {
    throw new NotImplementedException();
  }
}

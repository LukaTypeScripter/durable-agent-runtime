import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { DRIZZLE } from '../db/drizzle.module.js';
import type { Database } from '../db/drizzle.module.js';
import { runEvents, runs } from '../db/schema.js';
import { runCreatedStep } from './step-key.js';

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

@Injectable()
export class RunsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findById(_id: string): Promise<Run | null> {
    throw new NotImplementedException();
  }

  async createWithFirstEvent(input: NewRun): Promise<Run> {
    return this.db.transaction(async (tx) => {
      const [run] = await tx.insert(runs).values(input).returning();

      await tx.insert(runEvents).values({
        runId: run.id,
        sequence: 0,
        stepKey: runCreatedStep(),
        type: 'run_created',
        payload: {},
      });

      return run;
    });
  }
}

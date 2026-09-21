import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.module.js';
import type { Database } from '../db/drizzle.module.js';
import { runEvents, runs } from '../db/schema.js';
import { runCreatedStep } from './step-key.js';
import { RUN_CREATED } from './conversation.js';
import type { StepKey } from './step-key.js';
import type { ListRunsQuery } from '@dar/contracts';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration.js';

import type {
  NewRun,
  NewRunEvent,
  Run,
  RunEvent,
} from './runs.types.js';

@Injectable()
export class RunsRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async findById(id: string): Promise<Run | null> {
    const [run] = await this.db
      .select()
      .from(runs)
      .where(eq(runs.id, id))
      .limit(1);

    return run ?? null;
  }

  async claimForTurn(id: string, owner: string): Promise<Run | null> {
    const leaseSeconds =
      this.config.get('redis.turnLeaseMs', { infer: true }) / 1000;

    const [run] = await this.db
      .update(runs)
      .set({ status: 'running', claimedBy: owner, claimedAt: sql`now()`, updatedAt: sql`now()` })
      .where(
        and(
          eq(runs.id, id),
          or(
            eq(runs.status, 'pending'),
            and(
              eq(runs.status, 'running'),
              or(
                eq(runs.claimedBy, owner),
                sql`${runs.claimedAt} < now() - make_interval(secs => ${leaseSeconds})`,
              ),
            ),
          ),
        ),
      )
      .returning();

    return run ?? null;
  }

  async findMany(query: ListRunsQuery): Promise<Run[]> {
    return this.db
      .select()
      .from(runs)
      .where(
        query.status === undefined ? undefined : eq(runs.status, query.status),
      )
      .orderBy(desc(runs.createdAt))
      .limit(query.limit);
  }

  async findEventByStepKey(
    runId: string,
    stepKey: StepKey,
  ): Promise<RunEvent | null> {
    const [event] = await this.db
      .select()
      .from(runEvents)
      .where(and(eq(runEvents.runId, runId), eq(runEvents.stepKey, stepKey)))
      .limit(1);

    return event ?? null;
  }

  async findEventsByRun(runId: string): Promise<RunEvent[]> {
    return this.db
      .select()
      .from(runEvents)
      .where(eq(runEvents.runId, runId))
      .orderBy(runEvents.sequence);
  }

  async appendEvent(input: NewRunEvent): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [previous] = await tx
        .select({
          highest: sql<number>`coalesce(max(${runEvents.sequence}), 0)`,
        })
        .from(runEvents)
        .where(eq(runEvents.runId, input.runId));

      await tx.insert(runEvents).values({
        runId: input.runId,
        stepKey: input.stepKey,
        type: input.type,
        payload: input.payload,
        sequence: (previous?.highest ?? 0) + 1,
      });
    });
  }

  async findLatestEventByType(
    runId: string,
    type: string,
  ): Promise<RunEvent | null> {
    const [event] = await this.db
      .select()
      .from(runEvents)
      .where(and(eq(runEvents.runId, runId), eq(runEvents.type, type)))
      .orderBy(desc(runEvents.sequence))
      .limit(1);

    return event ?? null;
  }

  async markAwaitingApproval(id: string): Promise<void> {
    await this.db
      .update(runs)
      .set({ status: 'awaiting_approval', claimedAt: null, updatedAt: sql`now()` })
      .where(eq(runs.id, id));
  }

  async markPending(id: string): Promise<void> {
    await this.db
      .update(runs)
      .set({ status: 'pending', claimedAt: null, updatedAt: sql`now()` })
      .where(eq(runs.id, id));
  }

  async markFailed(id: string, reason: string): Promise<void> {
    await this.db
      .update(runs)
      .set({ status: 'failed', failReason: reason, updatedAt: sql`now()` })
      .where(eq(runs.id, id));
  }

  async markCompleted(id: string): Promise<void> {
    await this.db
      .update(runs)
      .set({ status: 'completed', updatedAt: sql`now()` })
      .where(eq(runs.id, id));
  }

  async createWithFirstEvent(input: NewRun): Promise<Run> {
    return this.db.transaction(async (tx) => {
      const [run] = await tx.insert(runs).values(input).returning();

      await tx.insert(runEvents).values({
        runId: run.id,
        sequence: 0,
        stepKey: runCreatedStep(),
        type: RUN_CREATED,
        payload: { goal: input.goal },
      });

      return run;
    });
  }
}

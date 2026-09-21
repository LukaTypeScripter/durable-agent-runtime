import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.module.js';
import type { Database } from '../db/drizzle.module.js';
import { runEvents, runs } from '../db/schema.js';
import { runCreatedStep } from './step-key.js';
import { RUN_CREATED } from './conversation.js';
import type { StepKey } from './step-key.js';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration.js';

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type RunEvent = typeof runEvents.$inferSelect;

export interface NewRunEvent {
  runId: string;
  stepKey: StepKey;
  type: string;
  payload: unknown;
}

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

  async claimForTurn(id: string): Promise<Run | null> {
    const leaseSeconds =
      this.config.get('redis.turnLeaseMs', { infer: true }) / 1000;

    const [run] = await this.db
      .update(runs)
      .set({ status: 'running', claimedAt: sql`now()`, updatedAt: sql`now()` })
      .where(
        and(
          eq(runs.id, id),
          or(
            eq(runs.status, 'pending'),
            and(
              eq(runs.status, 'running'),
              sql`${runs.claimedAt} < NOW() - make_interval(secs => ${leaseSeconds})`,
            ),
          ),
        ),
      )
      .returning();

    return run ?? null;
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

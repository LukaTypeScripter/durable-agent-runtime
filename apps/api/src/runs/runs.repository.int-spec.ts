import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from '../db/schema.js';
import { runEvents, runs } from '../db/schema.js';
import type { Database } from '../db/drizzle.module.js';
import { RunsRepository } from './runs.repository.js';
import { approvalStep, llmCallStep, toolCallStep } from './step-key.js';

const LEASE_MS = 300_000;

describe('RunsRepository against Postgres', () => {
  let container: StartedPostgreSqlContainer;
  let pool: pg.Pool;
  let db: Database;
  let repository: RunsRepository;

  const config = {
    get: () => LEASE_MS,
  } as unknown as ConfigService<never, true>;

  const newRun = () => ({
    goal: 'summarise the incident report',
    model: 'claude-haiku-4-5' as const,
  });

  const backdateClaim = (id: string, ageMs: number) =>
    db
      .update(runs)
      .set({
        claimedAt: sql`now() - make_interval(secs => ${ageMs / 1000})`,
      })
      .where(eq(runs.id, id));

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();

    pool = new pg.Pool({ connectionString: container.getConnectionUri() });
    db = drizzle(pool, { schema, casing: 'snake_case' });

    await migrate(db, { migrationsFolder: './drizzle' });

    repository = new RunsRepository(db, config);
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  beforeEach(async () => {
    await db.delete(runEvents);
    await db.delete(runs);
  });

  describe('createWithFirstEvent', () => {
    it('writes the run and its first journal entry together', async () => {
      const run = await repository.createWithFirstEvent(newRun());

      expect(run.status).toBe('pending');
      expect(run.claimedAt).toBeNull();

      const events = await repository.findEventsByRun(run.id);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('run_created');
      expect(events[0].payload).toEqual({ goal: newRun().goal });
    });
  });

  describe('findById', () => {
    it('returns null for a run that does not exist', async () => {
      const missing = await repository.findById(
        '00000000-0000-4000-8000-00000000dead',
      );

      expect(missing).toBeNull();
    });
  });

  describe('claimForTurn', () => {
    it('claims a pending run and stamps the lease', async () => {
      const created = await repository.createWithFirstEvent(newRun());

      const claimed = await repository.claimForTurn(created.id);

      expect(claimed?.status).toBe('running');
      expect(claimed?.claimedAt).not.toBeNull();
    });

    it('refuses a run another worker holds on a live lease', async () => {
      const created = await repository.createWithFirstEvent(newRun());
      await repository.claimForTurn(created.id);

      expect(await repository.claimForTurn(created.id)).toBeNull();
    });

    it('takes over a run whose lease has expired', async () => {
      const created = await repository.createWithFirstEvent(newRun());
      await repository.claimForTurn(created.id);
      await backdateClaim(created.id, LEASE_MS + 60_000);

      const reclaimed = await repository.claimForTurn(created.id);

      expect(reclaimed?.status).toBe('running');
    });

    it('never reclaims a finished run', async () => {
      const created = await repository.createWithFirstEvent(newRun());
      await repository.markCompleted(created.id);
      await backdateClaim(created.id, LEASE_MS + 60_000);

      expect(await repository.claimForTurn(created.id)).toBeNull();
    });
  });

  describe('appendEvent', () => {
    it('numbers events in the order they are appended', async () => {
      const run = await repository.createWithFirstEvent(newRun());

      await repository.appendEvent({
        runId: run.id,
        stepKey: llmCallStep(1),
        type: 'llm_response',
        payload: { stop_reason: 'tool_use' },
      });
      await repository.appendEvent({
        runId: run.id,
        stepKey: toolCallStep(1, 0),
        type: 'tool_result',
        payload: { tool_use_id: 'toolu_1' },
      });

      const events = await repository.findEventsByRun(run.id);

      expect(events.map((event) => event.sequence)).toEqual([0, 1, 2]);
      expect(events.map((event) => event.stepKey)).toEqual([
        'run:created',
        'turn:1:llm',
        'turn:1:tool:0',
      ]);
    });

    it('rejects a second event for the same step', async () => {
      const run = await repository.createWithFirstEvent(newRun());
      const event = {
        runId: run.id,
        stepKey: llmCallStep(1),
        type: 'llm_response',
        payload: { first: true },
      };

      await repository.appendEvent(event);

      await expect(
        repository.appendEvent({ ...event, payload: { second: true } }),
      ).rejects.toThrow();

      const stored = await repository.findEventByStepKey(
        run.id,
        llmCallStep(1),
      );

      expect(stored?.payload).toEqual({ first: true });
    });
  });

  describe('findEventByStepKey', () => {
    it('finds only the step it was asked for', async () => {
      const run = await repository.createWithFirstEvent(newRun());

      await repository.appendEvent({
        runId: run.id,
        stepKey: llmCallStep(1),
        type: 'llm_response',
        payload: { turn: 1 },
      });

      expect(
        (await repository.findEventByStepKey(run.id, llmCallStep(1)))?.payload,
      ).toEqual({ turn: 1 });
      expect(await repository.findEventByStepKey(run.id, llmCallStep(2))).toBeNull();
    });
  });

  describe('approval parking', () => {
    it('releases the lease so no worker keeps the run', async () => {
      const created = await repository.createWithFirstEvent(newRun());
      await repository.claimForTurn(created.id);

      await repository.markAwaitingApproval(created.id);

      const parked = await repository.findById(created.id);

      expect(parked?.status).toBe('awaiting_approval');
      expect(parked?.claimedAt).toBeNull();
    });

    it('is never picked up again while it waits, however long that is', async () => {
      const created = await repository.createWithFirstEvent(newRun());
      await repository.claimForTurn(created.id);
      await repository.markAwaitingApproval(created.id);
      await backdateClaim(created.id, LEASE_MS * 100);

      expect(await repository.claimForTurn(created.id)).toBeNull();
    });

    it('becomes claimable again once a reviewer decides', async () => {
      const created = await repository.createWithFirstEvent(newRun());
      await repository.claimForTurn(created.id);
      await repository.markAwaitingApproval(created.id);

      await repository.markPending(created.id);

      expect((await repository.claimForTurn(created.id))?.status).toBe(
        'running',
      );
    });

    it('finds the most recent request when several were made', async () => {
      const run = await repository.createWithFirstEvent(newRun());

      await repository.appendEvent({
        runId: run.id,
        stepKey: approvalStep(1, 0),
        type: 'approval_requested',
        payload: { turn: 1, index: 0 },
      });
      await repository.appendEvent({
        runId: run.id,
        stepKey: approvalStep(2, 0),
        type: 'approval_requested',
        payload: { turn: 2, index: 0 },
      });

      const latest = await repository.findLatestEventByType(
        run.id,
        'approval_requested',
      );

      expect(latest?.payload).toEqual({ turn: 2, index: 0 });
    });
  });

  describe('terminal transitions', () => {
    it('records why a run failed', async () => {
      const run = await repository.createWithFirstEvent(newRun());

      await repository.markFailed(run.id, 'turn_budget_exhausted');

      const stored = await repository.findById(run.id);

      expect(stored?.status).toBe('failed');
      expect(stored?.failReason).toBe('turn_budget_exhausted');
    });
  });
});

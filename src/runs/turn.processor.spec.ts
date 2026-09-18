import { NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Job, Worker } from 'bullmq';
import { TurnProcessor } from './turn.processor.js';
import type { TurnJobData } from '../queue/queue.constants.js';

describe('TurnProcessor', () => {
  const config = { get: () => 8 } as unknown as ConfigService<never, true>;

  it('applies the configured concurrency to the worker', () => {
    const processor = new TurnProcessor(config);
    const worker = { concurrency: 1 } as Worker;
    Object.assign(processor, { _worker: worker });

    processor.onApplicationBootstrap();

    expect(worker.concurrency).toBe(8);
  });

  it('reports that no executor exists yet', () => {
    const processor = new TurnProcessor(config);
    const job = {
      data: { runId: 'run-1', stepKey: 'turn-1' },
    } as Job<TurnJobData>;

    expect(() => processor.process(job)).toThrow(NotImplementedException);
  });
});

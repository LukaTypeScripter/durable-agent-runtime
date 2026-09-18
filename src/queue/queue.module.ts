import { Global, Inject, Module } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { AppConfig } from '../config/configuration.js';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const redisClientProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<AppConfig, true>) =>
    new Redis(config.get('redis.url', { infer: true }), {
      maxRetriesPerRequest: null,
    }),
};

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      extraProviders: [redisClientProvider],
      inject: [REDIS_CLIENT, ConfigService],
      useFactory: (
        connection: Redis,
        config: ConfigService<AppConfig, true>,
      ) => ({
        connection,
        prefix: config.get('redis.queuePrefix', { infer: true }),
        defaultJobOptions: {
          attempts: config.get('redis.turnMaxAttempts', { infer: true }),
          backoff: {
            type: 'exponential',
            delay: config.get('redis.turnBackoffMs', { infer: true }),
          },
          removeOnComplete: { age: 3600, count: 1000 },
          removeOnFail: { age: 86400 },
        },
      }),
    }),
  ],
  providers: [redisClientProvider],
  exports: [BullModule, REDIS_CLIENT],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}

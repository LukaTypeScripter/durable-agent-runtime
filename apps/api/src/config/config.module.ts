import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { buildConfig } from './configuration.js';
import type { AppConfig } from './configuration.js';
import { validateEnv } from './env.schema.js';

export type AppConfigService = ConfigService<AppConfig, true>;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['../../.env', '.env'],
      load: [() => buildConfig(validateEnv(process.env))],
    }),
  ],
})
export class AppConfigModule {}

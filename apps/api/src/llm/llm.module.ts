import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type { AppConfig } from '../config/configuration.js';
import { LlmService } from './llm.service.js';
import { ANTHROPIC } from './llm.tokens.js';

export { ANTHROPIC };

@Module({
  providers: [
    {
      provide: ANTHROPIC,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const apiKey = config.get('llm.anthropic.apiKey', { infer: true });

        if (apiKey === undefined) {
          return null;
        }

        const workspaceId = config.get('llm.anthropic.workspaceId', {
          infer: true,
        });

        return new Anthropic({
          apiKey,
          defaultHeaders:
            workspaceId === undefined
              ? undefined
              : { 'anthropic-workspace-id': workspaceId },
          timeout: config.get('llm.requestTimeoutMs', { infer: true }),
          maxRetries: config.get('llm.maxRetries', { infer: true }),
        });
      },
    },
    LlmService,
  ],
  exports: [LlmService],
})
export class LlmModule {}

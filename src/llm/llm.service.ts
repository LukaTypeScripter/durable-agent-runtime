import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC } from './llm.module.js';

const MAX_TOKENS = 16_000;

export type LlmResponse = Anthropic.Message;

@Injectable()
export class LlmService {
  constructor(@Inject(ANTHROPIC) private readonly client: Anthropic | null) {}

  respond(model: string, goal: string): Promise<LlmResponse> {
    if (this.client === null) {
      throw new ServiceUnavailableException(
        'ANTHROPIC_API_KEY is not configured',
      );
    }

    return this.client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: goal }],
    });
  }
}

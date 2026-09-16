import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config/configuration.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);

  app.enableShutdownHooks();

  const port = config.get('app.port', { infer: true });
  await app.listen(port);

  new Logger('Bootstrap').log(`Listening on port ${port}`);
}

await bootstrap();

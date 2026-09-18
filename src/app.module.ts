import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppConfigModule } from './config/config.module.js';
import { DrizzleModule } from './db/drizzle.module.js';
import { RunsModule } from './runs/runs.module.js';

@Module({
  imports: [AppConfigModule, DrizzleModule, RunsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

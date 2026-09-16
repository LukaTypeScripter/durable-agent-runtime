import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AppConfigModule } from './config/config.module.js';
import { DrizzleModule } from './db/drizzle.module.js';

@Module({
  imports: [AppConfigModule, DrizzleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

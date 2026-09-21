import { Module } from '@nestjs/common';
import { ToolRegistry } from './tool-registry.js';

@Module({
  providers: [ToolRegistry],
  exports: [ToolRegistry],
})
export class ToolsModule {}

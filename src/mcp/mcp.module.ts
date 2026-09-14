import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';

@Module({
  imports: [ApplicationModule],
  providers: [],
  exports: [],
})
export class McpModule {}

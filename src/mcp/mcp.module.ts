import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';

@Module({
  imports: [ApplicationModule],
  providers: [RecentActivitiesTool],
  exports: [RecentActivitiesTool],
})
export class McpModule {}

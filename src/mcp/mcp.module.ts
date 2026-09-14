import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';

@Module({
  imports: [ApplicationModule],
  providers: [RecentActivitiesTool, ActivityDetailTool],
  exports: [RecentActivitiesTool, ActivityDetailTool],
})
export class McpModule {}

import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';

@Module({
  imports: [ApplicationModule],
  providers: [RecentActivitiesTool, ActivityDetailTool, WellnessTrendTool, PlannedWeekTool],
  exports: [RecentActivitiesTool, ActivityDetailTool, WellnessTrendTool, PlannedWeekTool],
})
export class McpModule {}

import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { ActivityIntervalsTool } from './tools/activity-intervals.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';
import { TrainingLoadSummaryTool } from './tools/training-load-summary.tool';
import { ComparePeriodsTool } from './tools/compare-periods.tool';
import { McpController } from './mcp.controller';
import { McpTransportService } from './mcp-transport.service';

export const tools = [
  RecentActivitiesTool,
  ActivityDetailTool,
  ActivityIntervalsTool,
  WellnessTrendTool,
  PlannedWeekTool,
  TrainingLoadSummaryTool,
  ComparePeriodsTool,
];

@Module({
  imports: [ApplicationModule],
  controllers: [McpController],
  providers: [...tools, McpTransportService],
  exports: tools,
})
export class McpModule {}

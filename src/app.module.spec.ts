import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RecentActivitiesTool } from './mcp/tools/recent-activities.tool';
import { ActivityDetailTool } from './mcp/tools/activity-detail.tool';
import { WellnessTrendTool } from './mcp/tools/wellness-trend.tool';
import { PlannedWeekTool } from './mcp/tools/planned-week.tool';
import { TrainingLoadSummaryTool } from './mcp/tools/training-load-summary.tool';
import { ComparePeriodsTool } from './mcp/tools/compare-periods.tool';

describe('AppModule DI graph', () => {
  it('boots and resolves all 6 MCP tools without throwing', async () => {
    process.env.INTERVALS_API_KEY = 'test-key';
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    for (const Tool of [
      RecentActivitiesTool,
      ActivityDetailTool,
      WellnessTrendTool,
      PlannedWeekTool,
      TrainingLoadSummaryTool,
      ComparePeriodsTool,
    ]) {
      expect(app.get(Tool)).toBeDefined();
    }
    await app.close();
  });
});

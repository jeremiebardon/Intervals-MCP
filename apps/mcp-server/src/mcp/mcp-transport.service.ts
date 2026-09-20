import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { McpTool } from './tool';
import { toMcpError } from './errors';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { ActivityIntervalsTool } from './tools/activity-intervals.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';
import { TrainingLoadSummaryTool } from './tools/training-load-summary.tool';
import { ComparePeriodsTool } from './tools/compare-periods.tool';

function registerTool(
  server: McpServer,
  tool: McpTool<unknown, unknown>,
): void {
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.inputSchema },
    async (input: unknown) => {
      try {
        const result = await tool.execute(input);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (err) {
        const mapped = toMcpError(err);
        return {
          content: [{ type: 'text', text: JSON.stringify(mapped) }],
          isError: true,
        };
      }
    },
  );
}

// Streamable HTTP stateless mode: a fresh McpServer + transport per request,
// closed when the response closes. This is the SDK's documented stateless
// pattern -- reusing one transport across concurrent requests is only valid
// in stateful (session-ID) mode, which this server does not need (exactly
// one long-lived agent client, all tools read-only).
@Injectable()
export class McpTransportService {
  constructor(
    private readonly recentActivities: RecentActivitiesTool,
    private readonly activityDetail: ActivityDetailTool,
    private readonly activityIntervals: ActivityIntervalsTool,
    private readonly wellnessTrend: WellnessTrendTool,
    private readonly plannedWeek: PlannedWeekTool,
    private readonly trainingLoadSummary: TrainingLoadSummaryTool,
    private readonly comparePeriods: ComparePeriodsTool,
  ) {}

  async handleRequest(
    req: Request,
    res: Response,
    body: unknown,
  ): Promise<void> {
    const server = new McpServer({
      name: 'intervals-icu-mcp',
      version: '0.1.0',
    });
    for (const tool of [
      this.recentActivities,
      this.activityDetail,
      this.activityIntervals,
      this.wellnessTrend,
      this.plannedWeek,
      this.trainingLoadSummary,
      this.comparePeriods,
    ]) {
      registerTool(server, tool);
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  }
}

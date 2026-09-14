import { INestApplicationContext } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpTool } from './tool';
import { toMcpError } from './errors';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';
import { TrainingLoadSummaryTool } from './tools/training-load-summary.tool';
import { ComparePeriodsTool } from './tools/compare-periods.tool';

function registerTool(server: McpServer, tool: McpTool<unknown, unknown>): void {
  // Note: the installed @modelcontextprotocol/sdk (1.30.0) exposes `registerTool(name, config, cb)`
  // as the current API; the older `tool(name, description, schema, cb)` overload used in the brief
  // is deprecated in this version. `config.inputSchema` accepts a full zod schema (`AnySchema`)
  // directly -- not only a raw shape -- so `tool.inputSchema` is passed through unchanged.
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.inputSchema },
    async (input: unknown) => {
      try {
        const result = await tool.execute(input);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (err) {
        const mapped = toMcpError(err);
        return { content: [{ type: 'text', text: JSON.stringify(mapped) }], isError: true };
      }
    },
  );
}

export async function startMcpServer(app: INestApplicationContext): Promise<void> {
  const server = new McpServer({ name: 'intervals-icu-mcp', version: '0.1.0' });

  registerTool(server, app.get(RecentActivitiesTool));
  registerTool(server, app.get(ActivityDetailTool));
  registerTool(server, app.get(WellnessTrendTool));
  registerTool(server, app.get(PlannedWeekTool));
  registerTool(server, app.get(TrainingLoadSummaryTool));
  registerTool(server, app.get(ComparePeriodsTool));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

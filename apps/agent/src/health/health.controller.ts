import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HttpHealthIndicator } from '@nestjs/terminus';

function mcpServerLiveUrl(): string {
  const mcpServerUrl = process.env.MCP_SERVER_URL ?? 'http://mcp-server:3300/mcp';
  return new URL('/health/live', mcpServerUrl).toString();
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
  ) {}

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    return this.health.check([
      () => this.http.pingCheck('mcp-server', mcpServerLiveUrl()),
      () => this.http.pingCheck('ollama', ollamaUrl),
    ]);
  }
}

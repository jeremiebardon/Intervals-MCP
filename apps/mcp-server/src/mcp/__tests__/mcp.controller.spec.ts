import { NestFactory } from '@nestjs/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { AppModule } from '../../app.module';

describe('MCP Streamable HTTP transport', () => {
  process.env.INTERVALS_API_KEY = 'test-key';
  let app: import('@nestjs/common').INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port =
      typeof address === 'object' && address ? address.port : address;
    baseUrl = `http://127.0.0.1:${port}/mcp`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists all 7 tools over a real Streamable HTTP round trip', async () => {
    const client = new Client({ name: 'test-client', version: '0.0.1' });
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl));
    await client.connect(transport);

    const { tools } = await client.listTools();

    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        'get_recent_activities',
        'get_activity_detail',
        'get_activity_intervals',
        'get_wellness_trend',
        'get_planned_week',
        'get_training_load_summary',
        'compare_periods',
      ].sort(),
    );

    await client.close();
  });

  it('returns 405 for GET (stateless mode has no standing session)', async () => {
    const response = await fetch(baseUrl, { method: 'GET' });
    expect(response.status).toBe(405);
  });

  it('returns 405 for DELETE (stateless mode has no session to terminate)', async () => {
    const response = await fetch(baseUrl, { method: 'DELETE' });
    expect(response.status).toBe(405);
  });
});

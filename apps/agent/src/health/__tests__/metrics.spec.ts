import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HealthModule } from '../health.module';

// A minimal host module rather than the real AppModule: AppModule pulls in
// InfrastructureModule, whose LangGraphAgentAdapter.onModuleInit() reaches
// out to MCP_SERVER_URL/OLLAMA_BASE_URL at startup. This test only cares
// about the /metrics wiring, which lives entirely in HealthModule.
@Module({ imports: [HealthModule] })
class MetricsTestModule {}

describe('GET /metrics', () => {
  let app: import('@nestjs/common').INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(MetricsTestModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port =
      typeof address === 'object' && address ? address.port : address;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns Prometheus text format with default process metrics', async () => {
    const response = await fetch(`${baseUrl}/metrics`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/text\/plain/);
    expect(body).toMatch(/process_cpu_user_seconds_total/);
  });
});

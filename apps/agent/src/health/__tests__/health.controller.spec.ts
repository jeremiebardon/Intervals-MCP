import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { HealthController } from '../health.controller';

function makeHealthCheckService(): HealthCheckService {
  return {
    check: jest.fn((indicators: Array<() => unknown>) =>
      Promise.all(indicators.map((indicator) => indicator())).then(
        (results) => ({
          status: 'ok',
          info: Object.assign({}, ...results),
          error: {},
          details: Object.assign({}, ...results),
        }),
      ),
    ),
  } as unknown as HealthCheckService;
}

describe('HealthController', () => {
  it('reports liveness without checking any dependency', () => {
    const http = { pingCheck: jest.fn() } as unknown as HttpHealthIndicator;
    const controller = new HealthController(makeHealthCheckService(), http);
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(http.pingCheck).not.toHaveBeenCalled();
  });

  it('pings mcp-server and Ollama for readiness', async () => {
    const http = {
      pingCheck: jest.fn().mockResolvedValue({ dep: { status: 'up' } }),
    } as unknown as HttpHealthIndicator;
    const controller = new HealthController(makeHealthCheckService(), http);

    await controller.ready();

    expect(http.pingCheck).toHaveBeenCalledWith(
      'mcp-server',
      expect.stringContaining('/health/live'),
    );
    expect(http.pingCheck).toHaveBeenCalledWith(
      'ollama',
      expect.any(String),
    );
  });
});

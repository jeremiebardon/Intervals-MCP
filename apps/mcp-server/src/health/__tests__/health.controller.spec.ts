import { HealthController } from '../health.controller';

type HealthCheckService = any;
type HealthIndicatorService = any;

function makeHealthCheckService(): HealthCheckService {
  return {
    check: jest.fn((indicators: Array<() => unknown>) => {
      try {
        const results = indicators.map((indicator) => indicator());
        return Promise.all(results).then((resolvedResults) => {
          const allDetails = Object.assign({}, ...resolvedResults);
          // Check if any indicator returned 'down' status
          const downEntries = Object.entries(allDetails).filter(
            ([, detail]: [string, any]) => detail.status === 'down'
          );
          if (downEntries.length > 0) {
            // Extract the failure message from the first down status
            const firstDownMessage = (downEntries[0][1] as any).message || 'Health check failed';
            const error = new Error(firstDownMessage);
            (error as any).response = {
              status: 'error',
              info: allDetails,
              error: allDetails,
              details: allDetails,
            };
            throw error;
          }
          return {
            status: 'ok',
            info: allDetails,
            error: {},
            details: allDetails,
          };
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }),
  };
}

function makeHealthIndicatorService(): HealthIndicatorService {
  return {
    check: (key: string) => ({
      up: (data?: unknown) => ({
        [key]: { status: 'up', ...(typeof data === 'string' ? { message: data } : data) },
      }),
      down: (data?: unknown) => ({
        [key]: { status: 'down', ...(typeof data === 'string' ? { message: data } : data) },
      }),
      degraded: (data?: unknown) => ({
        [key]: { status: 'degraded', ...(typeof data === 'string' ? { message: data } : data) },
      }),
    }),
  };
}

describe('HealthController', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports liveness without checking any dependency', () => {
    const controller = new HealthController(makeHealthCheckService(), makeHealthIndicatorService());
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('reports ready when INTERVALS_API_KEY is set', async () => {
    process.env.INTERVALS_API_KEY = 'test-key';
    const controller = new HealthController(makeHealthCheckService(), makeHealthIndicatorService());
    await expect(controller.ready()).resolves.toMatchObject({
      status: 'ok',
    });
  });

  it('rejects ready when INTERVALS_API_KEY is missing', async () => {
    delete process.env.INTERVALS_API_KEY;
    const controller = new HealthController(makeHealthCheckService(), makeHealthIndicatorService());
    await expect(controller.ready()).rejects.toThrow('INTERVALS_API_KEY');
  });
});

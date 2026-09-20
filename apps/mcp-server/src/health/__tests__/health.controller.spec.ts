jest.mock('@nestjs/terminus', () => ({
  HealthCheckService: jest.fn(),
  HealthCheck: () => jest.fn(),
  HealthCheckError: class HealthCheckError extends Error {
    constructor(message: string, public response: unknown) {
      super(message);
      this.name = 'HealthCheckError';
    }
  },
}));

import { HealthController } from '../health.controller';

type HealthCheckService = any;

function makeHealthCheckService(): HealthCheckService {
  return {
    check: jest.fn((indicators: Array<() => unknown>) => {
      try {
        const results = indicators.map((indicator) => indicator());
        return Promise.all(results).then((resolvedResults) => ({
          status: 'ok',
          info: Object.assign({}, ...resolvedResults),
          error: {},
          details: Object.assign({}, ...resolvedResults),
        }));
      } catch (e) {
        return Promise.reject(e);
      }
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
    const controller = new HealthController(makeHealthCheckService());
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('reports ready when INTERVALS_API_KEY is set', async () => {
    process.env.INTERVALS_API_KEY = 'test-key';
    const controller = new HealthController(makeHealthCheckService());
    await expect(controller.ready()).resolves.toMatchObject({
      status: 'ok',
    });
  });

  it('rejects ready when INTERVALS_API_KEY is missing', async () => {
    delete process.env.INTERVALS_API_KEY;
    const controller = new HealthController(makeHealthCheckService());
    await expect(controller.ready()).rejects.toThrow('INTERVALS_API_KEY');
  });
});

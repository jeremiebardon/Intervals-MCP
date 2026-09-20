import { Module, Provider } from '@nestjs/common';

/**
 * Manual Jest mock for @nestjs/terminus.
 *
 * REASON FOR EXISTENCE: @nestjs/terminus@12.0.0 is published as pure ESM with
 * "type": "module" in its package.json and no CJS require-export condition.
 * ts-jest's CommonJS-based module system cannot directly require() ESM modules,
 * causing test suite failures. This manual mock intercepts the import and provides
 * a synchronous substitute that NestJS can instantiate.
 *
 * This is a copy of the working pattern established in
 * apps/mcp-server/src/__mocks__/@nestjs/terminus.ts. Jest resolves manual mocks
 * per-package, so each package needs its own copy under its own configured
 * `roots` (here: <rootDir>/src/__mocks__).
 *
 * Additionally mocks HttpHealthIndicator, which mcp-server does not need
 * (its readiness check doesn't ping over HTTP) but this app's HealthController
 * does, since it pings mcp-server and Ollama over HTTP.
 *
 * LIMITATION: The mock's HealthCheckService.check() always resolves { status: 'ok' }
 * and ignores its indicator arguments, and HttpHealthIndicator.pingCheck() always
 * resolves an "up" result for the given key. Only health.controller.spec.ts (which
 * passes its own fake HealthCheckService/HttpHealthIndicator directly via
 * constructor injection, bypassing this module-level mock) actually exercises
 * readiness behavior. Any future full-app-boot test relying on this mock for
 * DI wiring should not trust it for asserting real readiness semantics.
 */

class MockHealthCheckService {
  check = jest.fn(() => Promise.resolve({ status: 'ok' }));
}

class MockHttpHealthIndicator {
  pingCheck = jest.fn((key: string) =>
    Promise.resolve({ [key]: { status: 'up' } }),
  );
}

class MockHealthIndicatorService {
  check(key: string) {
    return {
      up: (data?: unknown) => {
        const extra = typeof data === 'string' ? { message: data } : (data as Record<string, unknown>) || {};
        return { [key]: { status: 'up', ...extra } };
      },
      down: (data?: unknown) => {
        const extra = typeof data === 'string' ? { message: data } : (data as Record<string, unknown>) || {};
        return { [key]: { status: 'down', ...extra } };
      },
      degraded: (data?: unknown) => {
        const extra = typeof data === 'string' ? { message: data } : (data as Record<string, unknown>) || {};
        return { [key]: { status: 'degraded', ...extra } };
      },
    };
  }
}

const healthCheckServiceProvider: Provider = {
  provide: 'HealthCheckService',
  useClass: MockHealthCheckService,
};

const httpHealthIndicatorProvider: Provider = {
  provide: 'HttpHealthIndicator',
  useClass: MockHttpHealthIndicator,
};

const healthIndicatorServiceProvider: Provider = {
  provide: 'HealthIndicatorService',
  useClass: MockHealthIndicatorService,
};

@Module({
  providers: [
    MockHealthCheckService,
    MockHttpHealthIndicator,
    MockHealthIndicatorService,
    healthCheckServiceProvider,
    httpHealthIndicatorProvider,
    healthIndicatorServiceProvider,
  ],
  exports: [
    MockHealthCheckService,
    MockHttpHealthIndicator,
    MockHealthIndicatorService,
    'HealthCheckService',
    'HttpHealthIndicator',
    'HealthIndicatorService',
  ],
})
class TerminusModule {}

export {
  HealthCheckService,
  HealthCheck,
  HttpHealthIndicator,
  HealthIndicatorService,
  TerminusModule,
};

// Mock exports
const HealthCheckService = MockHealthCheckService;
const HttpHealthIndicator = MockHttpHealthIndicator;
const HealthIndicatorService = MockHealthIndicatorService;
const HealthCheck = () => jest.fn();

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
 * LIMITATION: The mock's HealthCheckService.check() always resolves { status: 'ok' }
 * and ignores its indicator arguments. Tests that extend app.module.spec.ts or
 * mcp.controller.spec.ts to assert on GET /health/ready behavior should not trust
 * this mock; they will silently receive a fake always-passing result instead of
 * exercising real terminus readiness-check wiring.
 */

class MockHealthCheckService {
  check = jest.fn(() => Promise.resolve({ status: 'ok' }));
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

const healthIndicatorServiceProvider: Provider = {
  provide: 'HealthIndicatorService',
  useClass: MockHealthIndicatorService,
};

@Module({
  providers: [MockHealthCheckService, MockHealthIndicatorService, healthCheckServiceProvider, healthIndicatorServiceProvider],
  exports: [MockHealthCheckService, MockHealthIndicatorService, 'HealthCheckService', 'HealthIndicatorService'],
})
class TerminusModule {}

export {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorService,
  TerminusModule,
};

// Mock exports
const HealthCheckService = MockHealthCheckService;
const HealthIndicatorService = MockHealthIndicatorService;
const HealthCheck = () => jest.fn();

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

const healthCheckServiceProvider: Provider = {
  provide: 'HealthCheckService',
  useClass: MockHealthCheckService,
};

@Module({
  providers: [MockHealthCheckService, healthCheckServiceProvider],
  exports: [MockHealthCheckService, 'HealthCheckService'],
})
class TerminusModule {}

export {
  HealthCheckService,
  HealthCheck,
  HealthCheckError,
  TerminusModule,
};

// Mock exports
const HealthCheckService = MockHealthCheckService;
const HealthCheck = () => jest.fn();
class HealthCheckErrorImpl extends Error {
  constructor(message: string, public response: unknown) {
    super(message);
    this.name = 'HealthCheckError';
  }
}
const HealthCheckError = HealthCheckErrorImpl;

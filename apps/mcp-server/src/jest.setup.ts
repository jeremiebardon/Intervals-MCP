import { Module, Provider } from '@nestjs/common';

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

jest.mock('@nestjs/terminus', () => ({
  HealthCheckService: MockHealthCheckService,
  HealthCheck: () => jest.fn(),
  HealthCheckError: class HealthCheckError extends Error {
    constructor(message: string, public response: unknown) {
      super(message);
      this.name = 'HealthCheckError';
    }
  },
  TerminusModule,
}));

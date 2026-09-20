import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckError,
  HealthIndicatorResult,
} from '@nestjs/terminus';

function checkIntervalsConfig(): HealthIndicatorResult {
  if (!process.env.INTERVALS_API_KEY) {
    throw new HealthCheckError('INTERVALS_API_KEY is not set', {
      config: { status: 'down' },
    });
  }
  return { config: { status: 'up' } };
}

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([checkIntervalsConfig]);
  }
}

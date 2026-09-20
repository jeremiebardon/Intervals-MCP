import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorService,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => {
        const indicator = this.healthIndicatorService.check('config');
        return process.env.INTERVALS_API_KEY
          ? indicator.up()
          : indicator.down('INTERVALS_API_KEY is not set');
      },
    ]);
  }
}

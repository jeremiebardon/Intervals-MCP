import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    PrometheusModule.register({ defaultMetrics: { enabled: true } }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}

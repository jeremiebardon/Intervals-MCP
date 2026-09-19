import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { IntervalsPort } from '../application/ports/intervals.port';
import { ClockPort } from '../application/ports/clock.port';
import { IntervalsHttpAdapter } from './intervals/intervals-http.adapter';
import { SystemClockAdapter } from './clock/system-clock.adapter';
import { ApiKeyCredentialProvider } from './auth/api-key.credential-provider';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  providers: [
    ApiKeyCredentialProvider,
    { provide: IntervalsPort, useClass: IntervalsHttpAdapter },
    { provide: ClockPort, useClass: SystemClockAdapter },
  ],
  exports: [IntervalsPort, ClockPort],
})
export class InfrastructureModule {}

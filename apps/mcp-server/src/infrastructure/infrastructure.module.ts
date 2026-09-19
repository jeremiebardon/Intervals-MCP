import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { resolve } from 'path';
import { IntervalsPort } from '../application/ports/intervals.port';
import { ClockPort } from '../application/ports/clock.port';
import { IntervalsHttpAdapter } from './intervals/intervals-http.adapter';
import { SystemClockAdapter } from './clock/system-clock.adapter';
import { ApiKeyCredentialProvider } from './auth/api-key.credential-provider';

// This module resolves at both apps/mcp-server/src/infrastructure (nest
// start / ts-node) and apps/mcp-server/dist/infrastructure (node dist/main),
// which are the same depth below the repo root, so a fixed relative path
// reaches the repo-root .env regardless of run mode or process.cwd().
const REPO_ROOT_ENV_PATH = resolve(__dirname, '../../../../.env');

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: REPO_ROOT_ENV_PATH }),
    HttpModule,
  ],
  providers: [
    ApiKeyCredentialProvider,
    { provide: IntervalsPort, useClass: IntervalsHttpAdapter },
    { provide: ClockPort, useClass: SystemClockAdapter },
  ],
  exports: [IntervalsPort, ClockPort],
})
export class InfrastructureModule {}

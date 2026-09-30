import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configuration } from './configuration';

// Loads the repo-root .env for local runs; in Docker the variables come from
// compose and the file is absent, which is fine.
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
      load: [configuration],
    }),
  ],
})
export class ConfigModule {}

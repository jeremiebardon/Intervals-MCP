import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { IntervalsClient } from './intervals.client';

@Module({
  providers: [
    {
      provide: IntervalsClient,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const { apiKey, athleteId } = config.get('intervals', { infer: true });
        if (!apiKey) {
          throw new Error(
            'INTERVALS_API_KEY is not set. Copy .env.example to .env and fill in your intervals.icu personal API key.',
          );
        }
        return new IntervalsClient(apiKey, athleteId);
      },
    },
  ],
  exports: [IntervalsClient],
})
export class IntervalsModule {}

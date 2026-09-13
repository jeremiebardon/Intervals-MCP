import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyCredentialProvider {
  constructor(private readonly config: ConfigService) {}

  getApiKey(): string {
    const key = this.config.get<string>('INTERVALS_API_KEY');
    if (!key) {
      throw new Error(
        'INTERVALS_API_KEY is not set. Copy .env.example to .env and fill in your intervals.icu personal API key.',
      );
    }
    return key;
  }

  getAthleteId(): string {
    return this.config.get<string>('INTERVALS_ATHLETE_ID') ?? '0';
  }
}

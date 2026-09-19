import { ConfigService } from '@nestjs/config';
import { ApiKeyCredentialProvider } from '../api-key.credential-provider';

function makeConfig(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('ApiKeyCredentialProvider', () => {
  it('returns the configured API key', () => {
    const provider = new ApiKeyCredentialProvider(
      makeConfig({ INTERVALS_API_KEY: 'secret123' }),
    );
    expect(provider.getApiKey()).toBe('secret123');
  });

  it('throws when the API key is missing', () => {
    const provider = new ApiKeyCredentialProvider(makeConfig({}));
    expect(() => provider.getApiKey()).toThrow(/INTERVALS_API_KEY/);
  });

  it('defaults athlete id to "0"', () => {
    const provider = new ApiKeyCredentialProvider(
      makeConfig({ INTERVALS_API_KEY: 'x' }),
    );
    expect(provider.getAthleteId()).toBe('0');
  });

  it('returns a configured athlete id', () => {
    const provider = new ApiKeyCredentialProvider(
      makeConfig({ INTERVALS_API_KEY: 'x', INTERVALS_ATHLETE_ID: 'i12345' }),
    );
    expect(provider.getAthleteId()).toBe('i12345');
  });
});

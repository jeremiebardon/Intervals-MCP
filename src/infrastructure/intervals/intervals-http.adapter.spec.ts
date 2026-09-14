import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { IntervalsHttpAdapter } from './intervals-http.adapter';
import { ApiKeyCredentialProvider } from '../auth/api-key.credential-provider';
import { DateRange } from '../../domain/date-range';

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as never,
  };
}

describe('IntervalsHttpAdapter', () => {
  const credentials = {
    getApiKey: () => 'secret123',
    getAthleteId: () => '0',
  } as unknown as ApiKeyCredentialProvider;

  it('fetches and maps activities within a date range', async () => {
    const get = jest.fn().mockReturnValue(
      of(
        axiosResponse([
          {
            id: 'i12345',
            start_date_local: '2026-09-01T07:15:00',
            name: 'Morning Ride',
            type: 'Ride',
            distance: 42000,
            moving_time: 5400,
            icu_average_hr: 142,
            icu_pace: 128.5,
            icu_training_load: 65,
          },
        ]),
      ),
    );
    const http = { get } as unknown as HttpService;
    const adapter = new IntervalsHttpAdapter(http, credentials);

    const range = DateRange.of(new Date('2026-09-01'), new Date('2026-09-07'));
    const activities = await adapter.getActivities(range);

    expect(activities).toHaveLength(1);
    expect(activities[0].id).toBe('i12345');
    expect(get).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/0/activities',
      expect.objectContaining({
        auth: { username: 'API_KEY', password: 'secret123' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expect.objectContaining's jest type is `any`
        params: expect.objectContaining({
          oldest: '2026-09-01',
          newest: '2026-09-07',
        }),
      }),
    );
  });
});

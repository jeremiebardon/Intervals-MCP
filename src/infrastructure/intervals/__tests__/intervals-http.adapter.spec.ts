import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { IntervalsHttpAdapter } from '../intervals-http.adapter';
import { ApiKeyCredentialProvider } from '../../auth/api-key.credential-provider';
import { DateRange } from '../../../domain/date-range';

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

  it('maps activities where icu_average_hr and icu_pace are omitted by the API', async () => {
    const get = jest.fn().mockReturnValue(
      of(
        axiosResponse([
          {
            id: 'i67890',
            start_date_local: '2026-09-02T07:15:00',
            name: 'Strength Session',
            type: 'WeightTraining',
            distance: null,
            moving_time: 1800,
            icu_training_load: 20,
            // icu_average_hr and icu_pace intentionally absent
          },
        ]),
      ),
    );
    const http = { get } as unknown as HttpService;
    const adapter = new IntervalsHttpAdapter(http, credentials);

    const range = DateRange.of(new Date('2026-09-01'), new Date('2026-09-07'));
    const activities = await adapter.getActivities(range);

    expect(activities).toHaveLength(1);
    expect(activities[0].avgHeartRate).toBeNull();
    expect(activities[0].avgPace).toBeNull();
  });

  it('fetches and maps activity intervals', async () => {
    const get = jest.fn().mockReturnValue(
      of(
        axiosResponse({
          icu_intervals: [
            {
              id: 1,
              group_id: 'g1',
              label: 'Interval 1',
              type: 'WORK',
              moving_time: 300,
              distance: 1000,
              average_heartrate: 165,
              max_heartrate: 172,
              average_watts: null,
              average_speed: 3.5,
              gap: 3.4,
              average_cadence: 180,
              total_elevation_gain: 5,
              training_load: 12,
              zone: 4,
            },
          ],
          icu_groups: [
            {
              id: 'g1',
              count: 1,
              moving_time: 300,
              distance: 1000,
              average_heartrate: 165,
              average_watts: null,
              average_speed: 3.5,
            },
          ],
        }),
      ),
    );
    const http = { get } as unknown as HttpService;
    const adapter = new IntervalsHttpAdapter(http, credentials);

    const result = await adapter.getActivityIntervals('i1');

    expect(result.intervals).toHaveLength(1);
    expect(result.intervals[0]).toEqual({
      id: 1,
      groupId: 'g1',
      label: 'Interval 1',
      type: 'WORK',
      durationSeconds: 300,
      distanceMeters: 1000,
      avgHeartRate: 165,
      maxHeartRate: 172,
      avgPower: null,
      avgPaceMetersPerSecond: 3.5,
      gapMetersPerSecond: 3.4,
      avgCadence: 180,
      elevationGainMeters: 5,
      trainingLoad: 12,
      zone: 4,
    });
    expect(result.groups).toHaveLength(1);
    expect(get).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/activity/i1/intervals',
      expect.objectContaining({
        auth: { username: 'API_KEY', password: 'secret123' },
      }),
    );
  });
});

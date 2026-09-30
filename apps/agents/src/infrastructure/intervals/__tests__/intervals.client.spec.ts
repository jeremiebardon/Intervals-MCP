import { IntervalsClient } from '../intervals.client';
import { DateRange } from '../../../lib/date-range';

type FetchMock = jest.Mock<
  ReturnType<typeof fetch>,
  [URL, RequestInit | undefined]
>;

function mockFetch(body: unknown, status = 200): FetchMock {
  const fetchMock: FetchMock = jest.fn<
    ReturnType<typeof fetch>,
    [URL, RequestInit | undefined]
  >();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function calledUrl(fetchMock: FetchMock): URL {
  return fetchMock.mock.calls[0][0];
}

describe('IntervalsClient', () => {
  const client = new IntervalsClient('secret123', '0');
  const range = DateRange.of(new Date('2026-09-01'), new Date('2026-09-07'));

  afterEach(() => jest.restoreAllMocks());

  it('fetches and maps activities within a date range', async () => {
    const fetchMock = mockFetch([
      {
        id: 'i12345',
        start_date_local: '2026-09-01T07:15:00',
        name: 'Morning Ride',
        type: 'Ride',
        distance: 42000,
        moving_time: 5400,
        interval_summary: [],
        average_heartrate: 142,
        pace: 128.5,
        icu_training_load: 65,
      },
    ]);

    const activities = await client.getActivities(range, 'Ride');

    expect(activities).toHaveLength(1);
    expect(activities[0].id).toBe('i12345');
    const url = calledUrl(fetchMock);
    expect(url.pathname).toBe('/api/v1/athlete/0/activities');
    expect(url.searchParams.get('oldest')).toBe('2026-09-01');
    expect(url.searchParams.get('newest')).toBe('2026-09-07');
    expect(url.searchParams.get('type')).toBe('Ride');
    expect(fetchMock.mock.calls[0][1]).toEqual({
      headers: {
        authorization: `Basic ${Buffer.from('API_KEY:secret123').toString('base64')}`,
      },
    });
  });

  it('maps activities where average_heartrate and pace are omitted by the API', async () => {
    mockFetch([
      {
        id: 'i67890',
        start_date_local: '2026-09-02T07:15:00',
        name: 'Strength Session',
        type: 'WeightTraining',
        distance: null,
        moving_time: 1800,
        interval_summary: [],
        icu_training_load: 20,
      },
    ]);

    const activities = await client.getActivities(range);

    expect(activities[0].avgHeartRate).toBeNull();
    expect(activities[0].avgPace).toBeNull();
  });

  it('fetches and maps activity intervals', async () => {
    const fetchMock = mockFetch({
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
    });

    const result = await client.getActivityIntervals('i1');

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
    expect(calledUrl(fetchMock).pathname).toBe('/api/v1/activity/i1/intervals');
  });

  it('throws with the status when intervals.icu rejects the request', async () => {
    mockFetch({ error: 'nope' }, 401);

    await expect(client.getActivities(range)).rejects.toThrow(/401/);
  });
});

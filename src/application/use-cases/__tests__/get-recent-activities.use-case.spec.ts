import { GetRecentActivitiesUseCase } from '../get-recent-activities.use-case';
import { IntervalsPort } from '../../ports/intervals.port';
import { ClockPort } from '../../ports/clock.port';
import { Activity } from '../../../domain/activity';

const clock: ClockPort = { now: () => new Date('2026-09-07') };

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'i1',
    date: '2026-09-01',
    name: 'Ride',
    sport: 'Ride',
    description: null,
    distanceMeters: 10000,
    durationSeconds: 1800,
    elapsedSeconds: 1800,
    intervalSummary: [],
    avgHeartRate: 140,
    maxHeartRate: null,
    avgPace: 100,
    avgSpeedMetersPerSecond: null,
    gapMetersPerSecond: null,
    avgPowerWatts: null,
    weightedAvgPowerWatts: null,
    trainingLoad: 40,
    intensity: null,
    trimp: null,
    ctl: null,
    atl: null,
    decoupling: null,
    efficiencyFactor: null,
    perceivedExertion: null,
    icuRpe: null,
    feel: null,
    sessionRpe: null,
    avgCadence: null,
    elevationGainMeters: null,
    elevationLossMeters: null,
    calories: null,
    ...overrides,
  };
}

describe('GetRecentActivitiesUseCase', () => {
  it('returns activities within the range, capped at the default limit', async () => {
    const activities = Array.from({ length: 5 }, (_, i) =>
      makeActivity({ id: `i${i}` }),
    );
    const getActivities = jest.fn().mockResolvedValue(activities);
    const port = { getActivities } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port, clock);

    const result = await useCase.execute({
      from: '2026-09-01',
      to: '2026-09-07',
    });

    expect(result.total).toBe(5);
    expect(result.shown).toBe(5);
    expect(result.truncated).toBe(false);
    expect(result.hint).toBeNull();
    expect(getActivities).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('truncates and reports truncation when limit is smaller than total', async () => {
    const activities = Array.from({ length: 5 }, (_, i) =>
      makeActivity({ id: `i${i}` }),
    );
    const port = {
      getActivities: jest.fn().mockResolvedValue(activities),
    } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port, clock);

    const result = await useCase.execute({
      from: '2026-09-01',
      to: '2026-09-07',
      limit: 2,
    });

    expect(result.shown).toBe(2);
    expect(result.total).toBe(5);
    expect(result.truncated).toBe(true);
    expect(result.activities).toHaveLength(2);
    expect(result.hint).toBe('narrow the date range');
  });

  it('passes the sport filter through to the port', async () => {
    const getActivities = jest.fn().mockResolvedValue([]);
    const port = { getActivities } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port, clock);

    await useCase.execute({
      from: '2026-09-01',
      to: '2026-09-07',
      sport: 'Run',
    });

    expect(getActivities).toHaveBeenCalledWith(expect.anything(), 'Run');
  });

  it('defaults to the last 7 days when from/to are omitted', async () => {
    const getActivities = jest.fn<
      ReturnType<IntervalsPort['getActivities']>,
      Parameters<IntervalsPort['getActivities']>
    >().mockResolvedValue([]);
    const port = { getActivities } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port, clock);

    await useCase.execute({});

    const [range] = getActivities.mock.calls[0];
    expect(range.to.toISOString()).toBe('2026-09-07T00:00:00.000Z');
    expect(range.from.toISOString()).toBe('2026-08-31T00:00:00.000Z');
  });
});

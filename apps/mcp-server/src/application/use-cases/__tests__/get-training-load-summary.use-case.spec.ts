import { GetTrainingLoadSummaryUseCase } from '../get-training-load-summary.use-case';
import { IntervalsPort } from '../../ports/intervals.port';
import { Activity } from '../../../domain/activity';

function makeActivity(date: string, load: number): Activity {
  return {
    id: date,
    date,
    name: 'Session',
    sport: 'Ride',
    description: null,
    distanceMeters: 20000,
    durationSeconds: 3600,
    elapsedSeconds: 3600,
    intervalSummary: [],
    avgHeartRate: 140,
    maxHeartRate: null,
    avgPace: 100,
    avgSpeedMetersPerSecond: null,
    gapMetersPerSecond: null,
    avgPowerWatts: null,
    weightedAvgPowerWatts: null,
    trainingLoad: load,
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
  };
}

describe('GetTrainingLoadSummaryUseCase', () => {
  const clock = { now: () => new Date('2026-09-14') };

  it('computes one CTL/ATL/TSB point per day with activity data, ATL rising with recent load', async () => {
    const activities = [
      makeActivity('2026-09-01', 50),
      makeActivity('2026-09-02', 80),
    ];
    const port = {
      getActivities: jest.fn().mockResolvedValue(activities),
    } as unknown as IntervalsPort;
    const useCase = new GetTrainingLoadSummaryUseCase(port, clock);

    const result = await useCase.execute({ weeks: 2 });

    expect(result.points.length).toBeGreaterThan(0);
    const day2 = result.points.find((p) => p.date === '2026-09-02')!;
    const day1 = result.points.find((p) => p.date === '2026-09-01')!;
    expect(day2.atl).toBeGreaterThan(day1.atl);
  });

  it('aggregates weekly volume from activity distance/duration', async () => {
    const activities = [
      makeActivity('2026-09-01', 50),
      makeActivity('2026-09-02', 80),
    ];
    const port = {
      getActivities: jest.fn().mockResolvedValue(activities),
    } as unknown as IntervalsPort;
    const useCase = new GetTrainingLoadSummaryUseCase(port, clock);

    const result = await useCase.execute({ weeks: 2 });

    const totalDistance = result.weeklyVolume.reduce(
      (sum, w) => sum + w.totalDistanceMeters,
      0,
    );
    expect(totalDistance).toBe(40000);
  });

  it('does not include warm-up-period activity volume in weeklyVolume', async () => {
    // clock.now() is 2026-09-14; weeks: 2 => requested from is 2026-08-31.
    // This activity falls before that, in the warm-up window only.
    const activities = [makeActivity('2026-08-15', 50)];
    const port = {
      getActivities: jest.fn().mockResolvedValue(activities),
    } as unknown as IntervalsPort;
    const useCase = new GetTrainingLoadSummaryUseCase(port, clock);

    const result = await useCase.execute({ weeks: 2 });

    const totalDistance = result.weeklyVolume.reduce(
      (sum, w) => sum + w.totalDistanceMeters,
      0,
    );
    expect(totalDistance).toBe(0);
  });

  it('converges CTL close to sustained daily load after a long warm-up period', async () => {
    const dailyLoad = 60;
    const clockFixedFarOut = {
      now: () => new Date('2027-01-01'),
    };
    // Sustain the load for well over 42 days before the requested range starts.
    const activities: Activity[] = [];
    for (
      let d = new Date('2026-08-01');
      d <= new Date('2027-01-01');
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      activities.push(makeActivity(d.toISOString().slice(0, 10), dailyLoad));
    }
    const port = {
      getActivities: jest.fn().mockResolvedValue(activities),
    } as unknown as IntervalsPort;
    const useCase = new GetTrainingLoadSummaryUseCase(port, clockFixedFarOut);

    const result = await useCase.execute({ weeks: 1 });

    const lastPoint = result.points[result.points.length - 1];
    expect(lastPoint.ctl).toBeGreaterThan(dailyLoad * 0.9);
    expect(lastPoint.ctl).toBeLessThan(dailyLoad * 1.1);
  });

  it('defaults to 12 weeks when weeks is omitted', async () => {
    const getActivities = jest
      .fn<
        ReturnType<IntervalsPort['getActivities']>,
        Parameters<IntervalsPort['getActivities']>
      >()
      .mockResolvedValue([]);
    const port = { getActivities } as unknown as IntervalsPort;
    const useCase = new GetTrainingLoadSummaryUseCase(port, clock);

    await useCase.execute({});

    const [range] = getActivities.mock.calls[0];
    // clock.now() is 2026-09-14; 12 weeks back is 2026-06-22, minus the 42-day warm-up is 2026-05-11.
    expect(range.from.toISOString().slice(0, 10)).toBe('2026-05-11');
  });
});

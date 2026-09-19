import { ComparePeriodsUseCase } from '../compare-periods.use-case';
import { IntervalsPort } from '../../ports/intervals.port';
import { Activity } from '../../../domain/activity';

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: 'a',
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

describe('ComparePeriodsUseCase', () => {
  it('computes deltas as periodB minus periodA', async () => {
    const port = {
      getActivities: jest
        .fn()
        .mockResolvedValueOnce([
          makeActivity({
            distanceMeters: 10000,
            durationSeconds: 1800,
            trainingLoad: 40,
            avgHeartRate: 140,
          }),
        ])
        .mockResolvedValueOnce([
          makeActivity({
            distanceMeters: 30000,
            durationSeconds: 3600,
            trainingLoad: 90,
            avgHeartRate: 150,
          }),
        ]),
    } as unknown as IntervalsPort;
    const useCase = new ComparePeriodsUseCase(port);

    const result = await useCase.execute({
      periodA: { from: '2026-08-01', to: '2026-08-07' },
      periodB: { from: '2026-09-01', to: '2026-09-07' },
    });

    expect(result.deltas.distanceMeters).toBe(20000);
    expect(result.deltas.durationSeconds).toBe(1800);
    expect(result.deltas.trainingLoad).toBe(50);
  });

  it('returns null avgHeartRate delta when either period has no HR data', async () => {
    const port = {
      getActivities: jest
        .fn()
        .mockResolvedValueOnce([makeActivity({ avgHeartRate: null })])
        .mockResolvedValueOnce([makeActivity({ avgHeartRate: 150 })]),
    } as unknown as IntervalsPort;
    const useCase = new ComparePeriodsUseCase(port);

    const result = await useCase.execute({
      periodA: { from: '2026-08-01', to: '2026-08-07' },
      periodB: { from: '2026-09-01', to: '2026-09-07' },
    });

    expect(result.deltas.avgHeartRate).toBeNull();
  });
});

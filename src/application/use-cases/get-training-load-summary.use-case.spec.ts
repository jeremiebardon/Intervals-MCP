import { GetTrainingLoadSummaryUseCase } from './get-training-load-summary.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { ClockPort } from '../ports/clock.port';
import { Activity } from '../../domain/activity';

function makeActivity(date: string, load: number): Activity {
  return {
    id: date,
    date,
    name: 'Session',
    sport: 'Ride',
    distanceMeters: 20000,
    durationSeconds: 3600,
    avgHeartRate: 140,
    avgPace: 100,
    trainingLoad: load,
  };
}

describe('GetTrainingLoadSummaryUseCase', () => {
  const clock = { now: () => new Date('2026-09-14') } as unknown as ClockPort;

  it('computes one CTL/ATL/TSB point per day with activity data, ATL rising with recent load', async () => {
    const activities = [makeActivity('2026-09-01', 50), makeActivity('2026-09-02', 80)];
    const port = { getActivities: jest.fn().mockResolvedValue(activities) } as unknown as IntervalsPort;
    const useCase = new GetTrainingLoadSummaryUseCase(port, clock);

    const result = await useCase.execute({ weeks: 2 });

    expect(result.points.length).toBeGreaterThan(0);
    const day2 = result.points.find((p) => p.date === '2026-09-02')!;
    const day1 = result.points.find((p) => p.date === '2026-09-01')!;
    expect(day2.atl).toBeGreaterThan(day1.atl);
  });

  it('aggregates weekly volume from activity distance/duration', async () => {
    const activities = [makeActivity('2026-09-01', 50), makeActivity('2026-09-02', 80)];
    const port = { getActivities: jest.fn().mockResolvedValue(activities) } as unknown as IntervalsPort;
    const useCase = new GetTrainingLoadSummaryUseCase(port, clock);

    const result = await useCase.execute({ weeks: 2 });

    const totalDistance = result.weeklyVolume.reduce((sum, w) => sum + w.totalDistanceMeters, 0);
    expect(totalDistance).toBe(40000);
  });
});

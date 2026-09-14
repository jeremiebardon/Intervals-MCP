import { GetRecentActivitiesUseCase } from './get-recent-activities.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { Activity } from '../../domain/activity';

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'i1',
    date: '2026-09-01',
    name: 'Ride',
    sport: 'Ride',
    distanceMeters: 10000,
    durationSeconds: 1800,
    avgHeartRate: 140,
    avgPace: 100,
    trainingLoad: 40,
    ...overrides,
  };
}

describe('GetRecentActivitiesUseCase', () => {
  it('returns activities within the range, capped at the default limit', async () => {
    const activities = Array.from({ length: 5 }, (_, i) => makeActivity({ id: `i${i}` }));
    const port = { getActivities: jest.fn().mockResolvedValue(activities) } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port);

    const result = await useCase.execute({ from: '2026-09-01', to: '2026-09-07' });

    expect(result.total).toBe(5);
    expect(result.shown).toBe(5);
    expect(result.truncated).toBe(false);
    expect(port.getActivities).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('truncates and reports truncation when limit is smaller than total', async () => {
    const activities = Array.from({ length: 5 }, (_, i) => makeActivity({ id: `i${i}` }));
    const port = { getActivities: jest.fn().mockResolvedValue(activities) } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port);

    const result = await useCase.execute({ from: '2026-09-01', to: '2026-09-07', limit: 2 });

    expect(result.shown).toBe(2);
    expect(result.total).toBe(5);
    expect(result.truncated).toBe(true);
    expect(result.activities).toHaveLength(2);
  });

  it('passes the sport filter through to the port', async () => {
    const port = { getActivities: jest.fn().mockResolvedValue([]) } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port);

    await useCase.execute({ from: '2026-09-01', to: '2026-09-07', sport: 'Run' });

    expect(port.getActivities).toHaveBeenCalledWith(expect.anything(), 'Run');
  });
});

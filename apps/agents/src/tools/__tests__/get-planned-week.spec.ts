import { getPlannedWeek } from '../get-planned-week';
import { IntervalsClient } from '../../infrastructure/intervals/intervals.client';
import { PlannedWorkout } from '../../infrastructure/intervals/types';

describe('getPlannedWeek', () => {
  const workout: PlannedWorkout = {
    id: 'e1',
    date: '2026-09-08',
    name: 'Tempo run',
    sport: 'Run',
    description: null,
    plannedDurationSeconds: 3600,
    plannedDistanceMeters: 9000,
  };

  it('uses the given weekStart when provided', async () => {
    const port = {
      getPlannedWorkouts: jest.fn().mockResolvedValue([workout]),
    } as unknown as IntervalsClient;
    const now = jest.fn();
    const clock = { now };
    const deps = { intervals: port, now: clock.now };

    const result = await getPlannedWeek(deps, { weekStart: '2026-09-08' });

    expect(result.workouts).toEqual([workout]);
    expect(now).not.toHaveBeenCalled();
  });

  it('defaults to the current week when weekStart is omitted', async () => {
    const getPlannedWorkouts = jest.fn().mockResolvedValue([workout]);
    const port = { getPlannedWorkouts } as unknown as IntervalsClient;
    const clock = { now: () => new Date('2026-09-10') };
    const deps = { intervals: port, now: clock.now };

    await getPlannedWeek(deps, {});

    expect(getPlannedWorkouts).toHaveBeenCalledWith(expect.anything());
  });
});

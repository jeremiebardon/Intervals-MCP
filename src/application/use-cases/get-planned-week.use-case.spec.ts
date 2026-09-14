import { GetPlannedWeekUseCase } from './get-planned-week.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { ClockPort } from '../ports/clock.port';
import { PlannedWorkout } from '../../domain/planned-workout';

describe('GetPlannedWeekUseCase', () => {
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
    const port = { getPlannedWorkouts: jest.fn().mockResolvedValue([workout]) } as unknown as IntervalsPort;
    const clock = { now: jest.fn() } as unknown as ClockPort;
    const useCase = new GetPlannedWeekUseCase(port, clock);

    const result = await useCase.execute({ weekStart: '2026-09-08' });

    expect(result.workouts).toEqual([workout]);
    expect(clock.now).not.toHaveBeenCalled();
  });

  it('defaults to the current week when weekStart is omitted', async () => {
    const port = { getPlannedWorkouts: jest.fn().mockResolvedValue([workout]) } as unknown as IntervalsPort;
    const clock = { now: () => new Date('2026-09-10') } as unknown as ClockPort;
    const useCase = new GetPlannedWeekUseCase(port, clock);

    await useCase.execute({});

    expect(port.getPlannedWorkouts).toHaveBeenCalledWith(expect.anything());
  });
});

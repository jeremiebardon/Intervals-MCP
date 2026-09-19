import { GetWellnessTrendUseCase } from '../get-wellness-trend.use-case';
import { IntervalsPort } from '../../ports/intervals.port';
import { Wellness } from '../../../domain/wellness';

describe('GetWellnessTrendUseCase', () => {
  it('returns the wellness days for the range', async () => {
    const days: Wellness[] = [
      {
        date: '2026-09-01',
        hrv: 60,
        restingHeartRate: 48,
        sleepHours: 7.5,
        weightKg: 70,
        fatigue: 2,
      },
    ];
    const getWellness = jest.fn().mockResolvedValue(days);
    const port = { getWellness } as unknown as IntervalsPort;
    const useCase = new GetWellnessTrendUseCase(port);

    const result = await useCase.execute({
      from: '2026-09-01',
      to: '2026-09-07',
    });

    expect(result.days).toEqual(days);
    expect(result.truncated).toBe(false);
    expect(result.hint).toBeNull();
    expect(getWellness).toHaveBeenCalledWith(expect.anything());
  });

  it('truncates when more than 90 days are returned', async () => {
    const days: Wellness[] = Array.from({ length: 120 }, (_, i) => ({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      hrv: 60,
      restingHeartRate: 48,
      sleepHours: 7.5,
      weightKg: 70,
      fatigue: 2,
    }));
    const port = {
      getWellness: jest.fn().mockResolvedValue(days),
    } as unknown as IntervalsPort;
    const useCase = new GetWellnessTrendUseCase(port);

    const result = await useCase.execute({
      from: '2026-01-01',
      to: '2026-12-31',
    });

    expect(result.total).toBe(120);
    expect(result.shown).toBe(90);
    expect(result.truncated).toBe(true);
    expect(result.hint).toBe('narrow the date range');
  });
});

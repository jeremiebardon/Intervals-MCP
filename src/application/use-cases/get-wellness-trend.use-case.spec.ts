import { GetWellnessTrendUseCase } from './get-wellness-trend.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { Wellness } from '../../domain/wellness';

describe('GetWellnessTrendUseCase', () => {
  it('returns the wellness days for the range', async () => {
    const days: Wellness[] = [
      { date: '2026-09-01', hrv: 60, restingHeartRate: 48, sleepHours: 7.5, weightKg: 70, fatigue: 2 },
    ];
    const port = { getWellness: jest.fn().mockResolvedValue(days) } as unknown as IntervalsPort;
    const useCase = new GetWellnessTrendUseCase(port);

    const result = await useCase.execute({ from: '2026-09-01', to: '2026-09-07' });

    expect(result.days).toEqual(days);
    expect(port.getWellness).toHaveBeenCalledWith(expect.anything());
  });
});

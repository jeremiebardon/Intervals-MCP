import { GetActivityDetailUseCase } from './get-activity-detail.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { ActivityDetail } from '../../domain/activity';

describe('GetActivityDetailUseCase', () => {
  it('delegates to the port and returns the detail', async () => {
    const detail: ActivityDetail = {
      id: 'i1',
      date: '2026-09-01',
      name: 'Ride',
      sport: 'Ride',
      distanceMeters: 10000,
      durationSeconds: 1800,
      avgHeartRate: 140,
      avgPace: 100,
      trainingLoad: 40,
      intervals: [],
      hrZoneDistribution: {
        zone1Seconds: 0,
        zone2Seconds: 0,
        zone3Seconds: 0,
        zone4Seconds: 0,
        zone5Seconds: 0,
      },
    };
    const port = { getActivityDetail: jest.fn().mockResolvedValue(detail) } as unknown as IntervalsPort;
    const useCase = new GetActivityDetailUseCase(port);

    const result = await useCase.execute({ activityId: 'i1' });

    expect(result).toEqual(detail);
    expect(port.getActivityDetail).toHaveBeenCalledWith('i1');
  });
});

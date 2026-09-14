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
    const getActivityDetail = jest.fn().mockResolvedValue(detail);
    const port = { getActivityDetail } as unknown as IntervalsPort;
    const useCase = new GetActivityDetailUseCase(port);

    const result = await useCase.execute({ activityId: 'i1' });

    expect(result).toEqual({
      ...detail,
      intervalsTruncated: false,
      intervalsShown: 0,
      intervalsTotal: 0,
    });
    expect(getActivityDetail).toHaveBeenCalledWith('i1');
  });

  it('truncates intervals beyond the max and reports the envelope fields', async () => {
    const manyIntervals = Array.from({ length: 75 }, (_, i) => ({
      label: `interval-${i}`,
      durationSeconds: 60,
      distanceMeters: null,
      avgHeartRate: null,
      avgPower: null,
    }));
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
      intervals: manyIntervals,
      hrZoneDistribution: {
        zone1Seconds: 0,
        zone2Seconds: 0,
        zone3Seconds: 0,
        zone4Seconds: 0,
        zone5Seconds: 0,
      },
    };
    const port = {
      getActivityDetail: jest.fn().mockResolvedValue(detail),
    } as unknown as IntervalsPort;
    const useCase = new GetActivityDetailUseCase(port);

    const result = await useCase.execute({ activityId: 'i1' });

    expect(result.intervals).toHaveLength(50);
    expect(result.intervalsTruncated).toBe(true);
    expect(result.intervalsShown).toBe(50);
    expect(result.intervalsTotal).toBe(75);
  });
});

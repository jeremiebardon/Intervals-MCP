import { GetActivityIntervalsUseCase } from '../get-activity-intervals.use-case';
import { IntervalsPort } from '../../ports/intervals.port';
import { ActivityIntervalStat } from '../../../domain/activity';

function stat(id: number): ActivityIntervalStat {
  return {
    id,
    groupId: null,
    label: `interval-${id}`,
    type: 'WORK',
    durationSeconds: 300,
    distanceMeters: 1000,
    avgHeartRate: 165,
    maxHeartRate: 172,
    avgPower: null,
    avgPaceMetersPerSecond: 3.5,
    gapMetersPerSecond: 3.4,
    avgCadence: 180,
    elevationGainMeters: 5,
    trainingLoad: 12,
    zone: 4,
  };
}

describe('GetActivityIntervalsUseCase', () => {
  it('delegates to the port and returns intervals and groups', async () => {
    const intervals = [stat(1), stat(2)];
    const groups = [
      {
        id: 'g1',
        count: 2,
        durationSeconds: 600,
        distanceMeters: 2000,
        avgHeartRate: 165,
        avgPower: null,
        avgPaceMetersPerSecond: 3.5,
      },
    ];
    const getActivityIntervals = jest
      .fn()
      .mockResolvedValue({ intervals, groups });
    const port = { getActivityIntervals } as unknown as IntervalsPort;
    const useCase = new GetActivityIntervalsUseCase(port);

    const result = await useCase.execute({ activityId: 'i1' });

    expect(result).toEqual({
      intervals,
      groups,
      intervalsTruncated: false,
      intervalsShown: 2,
      intervalsTotal: 2,
    });
    expect(getActivityIntervals).toHaveBeenCalledWith('i1');
  });

  it('truncates intervals beyond the max and reports the envelope fields', async () => {
    const many = Array.from({ length: 75 }, (_, i) => stat(i));
    const port = {
      getActivityIntervals: jest
        .fn()
        .mockResolvedValue({ intervals: many, groups: [] }),
    } as unknown as IntervalsPort;
    const useCase = new GetActivityIntervalsUseCase(port);

    const result = await useCase.execute({ activityId: 'i1' });

    expect(result.intervals).toHaveLength(50);
    expect(result.intervalsTruncated).toBe(true);
    expect(result.intervalsShown).toBe(50);
    expect(result.intervalsTotal).toBe(75);
  });
});

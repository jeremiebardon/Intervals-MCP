import { getActivityIntervals } from '../get-activity-intervals';
import { IntervalsClient } from '../../infrastructure/intervals/intervals.client';
import { ActivityIntervalStat } from '../../infrastructure/intervals/types';

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

describe('getActivityIntervals', () => {
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
    const getActivityIntervalsMock = jest
      .fn()
      .mockResolvedValue({ intervals, groups });
    const port = {
      getActivityIntervals: getActivityIntervalsMock,
    } as unknown as IntervalsClient;
    const deps = { intervals: port, now: () => new Date() };

    const result = await getActivityIntervals(deps, { activityId: 'i1' });

    expect(result).toEqual({
      intervals,
      groups,
      intervalsTruncated: false,
      intervalsShown: 2,
      intervalsTotal: 2,
    });
    expect(getActivityIntervalsMock).toHaveBeenCalledWith('i1');
  });

  it('truncates intervals beyond the max and reports the envelope fields', async () => {
    const many = Array.from({ length: 75 }, (_, i) => stat(i));
    const port = {
      getActivityIntervals: jest
        .fn()
        .mockResolvedValue({ intervals: many, groups: [] }),
    } as unknown as IntervalsClient;
    const deps = { intervals: port, now: () => new Date() };

    const result = await getActivityIntervals(deps, { activityId: 'i1' });

    expect(result.intervals).toHaveLength(50);
    expect(result.intervalsTruncated).toBe(true);
    expect(result.intervalsShown).toBe(50);
    expect(result.intervalsTotal).toBe(75);
  });
});

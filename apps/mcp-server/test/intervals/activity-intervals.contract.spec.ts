import { readFileSync } from 'fs';
import { join } from 'path';
import { activityIntervalsResponseSchema } from '../../src/infrastructure/intervals/schemas';
import { toActivityIntervals } from '../../src/infrastructure/intervals/mappers';

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(join(__dirname, '../../fixtures', name), 'utf-8'),
  );
}

describe('intervals.icu activity intervals contract', () => {
  it('parses and maps the activity intervals fixture', () => {
    const parsed = activityIntervalsResponseSchema.parse(
      loadFixture('activity-intervals.json'),
    );
    const result = toActivityIntervals(parsed);

    expect(result.intervals).toHaveLength(6);
    expect(result.groups).toHaveLength(1);

    const work = result.intervals[1];
    expect(work).toMatchObject({
      id: 2,
      groupId: 'g1',
      label: 'Interval 1',
      type: 'WORK',
      durationSeconds: 300,
      distanceMeters: 1000,
      avgHeartRate: 168,
      avgPaceMetersPerSecond: 3.33,
      gapMetersPerSecond: 3.4,
    });

    const recovery = result.intervals[2];
    expect(recovery.type).toBe('RECOVERY');

    const group = result.groups[0];
    expect(group).toMatchObject({
      id: 'g1',
      count: 2,
      durationSeconds: 840,
      distanceMeters: 2690,
    });
  });
});

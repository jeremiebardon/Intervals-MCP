import { readFileSync } from 'fs';
import { join } from 'path';
import {
  activitiesResponseSchema,
  activityDetailSchema,
} from '../../src/infrastructure/intervals/schemas';
import {
  toActivity,
  toActivityDetail,
} from '../../src/infrastructure/intervals/mappers';

function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(join(__dirname, '../../fixtures', name), 'utf-8'),
  );
}

describe('intervals.icu activities contract', () => {
  it('parses and maps the activities list fixture', () => {
    const parsed = activitiesResponseSchema.parse(
      loadFixture('activities.json'),
    );
    const activities = parsed.map(toActivity);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      id: 'i12345',
      sport: 'Ride',
      distanceMeters: 42000,
    });
  });

  it('parses and maps the activity detail fixture', () => {
    const parsed = activityDetailSchema.parse(
      loadFixture('activity-detail.json'),
    );
    const detail = toActivityDetail(parsed);
    expect(detail.intervals).toHaveLength(2);
    expect(detail.hrZoneDistribution.zone2Seconds).toBe(900);
  });
});

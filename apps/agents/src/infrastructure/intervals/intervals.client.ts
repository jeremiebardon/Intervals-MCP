import { ZodType } from 'zod';
import { DateRange } from '../../lib/date-range';
import {
  Activity,
  ActivityDetail,
  ActivityIntervals,
  PlannedWorkout,
  Wellness,
} from './types';
import {
  activitiesResponseSchema,
  activityDetailSchema,
  activityIntervalsResponseSchema,
  plannedWorkoutsResponseSchema,
  wellnessResponseSchema,
} from './schemas';
import {
  toActivity,
  toActivityDetail,
  toActivityIntervals,
  toPlannedWorkout,
  toWellness,
} from './mappers';

const BASE_URL = 'https://intervals.icu/api/v1';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rangeParams(range: DateRange): Record<string, string> {
  return { oldest: isoDate(range.from), newest: isoDate(range.to) };
}

export class IntervalsClient {
  constructor(
    private readonly apiKey: string,
    private readonly athleteId = '0',
  ) {}

  private async get<T>(
    path: string,
    schema: ZodType<T>,
    params: Record<string, string> = {},
  ): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const auth = Buffer.from(`API_KEY:${this.apiKey}`).toString('base64');
    const response = await fetch(url, {
      headers: { authorization: `Basic ${auth}` },
    });
    if (!response.ok) {
      throw new Error(
        `intervals.icu ${path} failed: ${response.status} ${response.statusText}`,
      );
    }
    return schema.parse(await response.json());
  }

  private athletePath(): string {
    return `/athlete/${this.athleteId}`;
  }

  async getActivities(range: DateRange, sport?: string): Promise<Activity[]> {
    const params = rangeParams(range);
    if (sport) params.type = sport;
    const data = await this.get(
      `${this.athletePath()}/activities`,
      activitiesResponseSchema,
      params,
    );
    return data.map(toActivity);
  }

  async getActivityDetail(activityId: string): Promise<ActivityDetail> {
    const data = await this.get(
      `/activity/${activityId}`,
      activityDetailSchema,
    );
    return toActivityDetail(data);
  }

  async getActivityIntervals(activityId: string): Promise<ActivityIntervals> {
    const data = await this.get(
      `/activity/${activityId}/intervals`,
      activityIntervalsResponseSchema,
    );
    return toActivityIntervals(data);
  }

  async getWellness(range: DateRange): Promise<Wellness[]> {
    const data = await this.get(
      `${this.athletePath()}/wellness`,
      wellnessResponseSchema,
      rangeParams(range),
    );
    return data.map(toWellness);
  }

  async getPlannedWorkouts(range: DateRange): Promise<PlannedWorkout[]> {
    const data = await this.get(
      `${this.athletePath()}/events`,
      plannedWorkoutsResponseSchema,
      rangeParams(range),
    );
    return data.map(toPlannedWorkout);
  }
}

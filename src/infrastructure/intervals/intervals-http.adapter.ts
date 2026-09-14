import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IntervalsPort } from '../../application/ports/intervals.port';
import { DateRange } from '../../domain/date-range';
import { Activity, ActivityDetail, TrainingLoad } from '../../domain/activity';
import { Wellness } from '../../domain/wellness';
import { PlannedWorkout } from '../../domain/planned-workout';
import { ApiKeyCredentialProvider } from '../auth/api-key.credential-provider';
import {
  activitiesResponseSchema,
  activityDetailSchema,
  wellnessResponseSchema,
  plannedWorkoutsResponseSchema,
} from './schemas';
import { toActivity, toActivityDetail, toWellness, toPlannedWorkout } from './mappers';

const BASE_URL = 'https://intervals.icu/api/v1';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class IntervalsHttpAdapter implements IntervalsPort {
  constructor(
    private readonly http: HttpService,
    private readonly credentials: ApiKeyCredentialProvider,
  ) {}

  private auth() {
    return { username: 'API_KEY', password: this.credentials.getApiKey() };
  }

  private athletePath(): string {
    return `${BASE_URL}/athlete/${this.credentials.getAthleteId()}`;
  }

  async getActivities(range: DateRange, sport?: string): Promise<Activity[]> {
    const response = await firstValueFrom(
      this.http.get(`${this.athletePath()}/activities`, {
        auth: this.auth(),
        params: {
          oldest: isoDate(range.from),
          newest: isoDate(range.to),
          ...(sport ? { type: sport } : {}),
        },
      }),
    );
    return activitiesResponseSchema.parse(response.data).map(toActivity);
  }

  async getActivityDetail(activityId: string): Promise<ActivityDetail> {
    const response = await firstValueFrom(
      this.http.get(`${BASE_URL}/activity/${activityId}`, { auth: this.auth() }),
    );
    return toActivityDetail(activityDetailSchema.parse(response.data));
  }

  async getWellness(range: DateRange): Promise<Wellness[]> {
    const response = await firstValueFrom(
      this.http.get(`${this.athletePath()}/wellness`, {
        auth: this.auth(),
        params: { oldest: isoDate(range.from), newest: isoDate(range.to) },
      }),
    );
    return wellnessResponseSchema.parse(response.data).map(toWellness);
  }

  async getPlannedWorkouts(range: DateRange): Promise<PlannedWorkout[]> {
    const response = await firstValueFrom(
      this.http.get(`${this.athletePath()}/events`, {
        auth: this.auth(),
        params: { oldest: isoDate(range.from), newest: isoDate(range.to) },
      }),
    );
    return plannedWorkoutsResponseSchema.parse(response.data).map(toPlannedWorkout);
  }

  // NOTE: GetTrainingLoadSummaryUseCase computes CTL/ATL/TSB itself from
  // getActivities() and does not call this method. This method exists to
  // satisfy IntervalsPort's shape; revisit if a future use-case needs
  // upstream-computed load directly.
  async getTrainingLoad(range: DateRange): Promise<TrainingLoad[]> {
    const activities = await this.getActivities(range);
    return activities
      .filter((a) => a.trainingLoad !== null)
      .map((a) => ({ date: a.date, ctl: 0, atl: 0, tsb: 0 }));
  }
}

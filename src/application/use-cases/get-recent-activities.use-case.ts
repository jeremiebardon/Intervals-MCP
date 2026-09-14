import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { DateRange } from '../../domain/date-range';
import { Activity } from '../../domain/activity';

export interface GetRecentActivitiesInput {
  from: string;
  to: string;
  sport?: string;
  limit?: number;
}

export interface GetRecentActivitiesOutput {
  activities: Activity[];
  truncated: boolean;
  shown: number;
  total: number;
}

const DEFAULT_LIMIT = 20;

@Injectable()
export class GetRecentActivitiesUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  async execute(input: GetRecentActivitiesInput): Promise<GetRecentActivitiesOutput> {
    const range = DateRange.of(new Date(input.from), new Date(input.to));
    const all = await this.intervals.getActivities(range, input.sport);
    const limit = input.limit ?? DEFAULT_LIMIT;
    const activities = all.slice(0, limit);
    return {
      activities,
      truncated: all.length > activities.length,
      shown: activities.length,
      total: all.length,
    };
  }
}

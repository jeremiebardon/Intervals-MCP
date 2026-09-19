import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { ClockPort } from '../ports/clock.port';
import { DateRange } from '../../domain/date-range';
import { Activity } from '../../domain/activity';

export interface GetRecentActivitiesInput {
  from?: string;
  to?: string;
  sport?: string;
  limit?: number;
}

const DEFAULT_LOOKBACK_DAYS = 7;

export interface GetRecentActivitiesOutput {
  activities: Activity[];
  truncated: boolean;
  shown: number;
  total: number;
  hint: string | null;
}

const DEFAULT_LIMIT = 20;

@Injectable()
export class GetRecentActivitiesUseCase {
  constructor(
    private readonly intervals: IntervalsPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(
    input: GetRecentActivitiesInput,
  ): Promise<GetRecentActivitiesOutput> {
    const to = input.to ? new Date(input.to) : this.clock.now();
    const from = input.from
      ? new Date(input.from)
      : new Date(to.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const range = DateRange.of(from, to);
    const all = await this.intervals.getActivities(range, input.sport);
    const limit = input.limit ?? DEFAULT_LIMIT;
    const activities = all.slice(0, limit);
    const truncated = all.length > activities.length;
    return {
      activities,
      truncated,
      shown: activities.length,
      total: all.length,
      hint: truncated ? 'narrow the date range' : null,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import {
  ActivityIntervalGroup,
  ActivityIntervalStat,
} from '../../domain/activity';

export interface GetActivityIntervalsInput {
  activityId: string;
}

export interface GetActivityIntervalsOutput {
  intervals: ActivityIntervalStat[];
  groups: ActivityIntervalGroup[];
  intervalsTruncated: boolean;
  intervalsShown: number;
  intervalsTotal: number;
}

const MAX_INTERVALS = 50;

@Injectable()
export class GetActivityIntervalsUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  async execute(
    input: GetActivityIntervalsInput,
  ): Promise<GetActivityIntervalsOutput> {
    const result = await this.intervals.getActivityIntervals(input.activityId);
    const intervals = result.intervals.slice(0, MAX_INTERVALS);
    return {
      intervals,
      groups: result.groups,
      intervalsTruncated: result.intervals.length > intervals.length,
      intervalsShown: intervals.length,
      intervalsTotal: result.intervals.length,
    };
  }
}

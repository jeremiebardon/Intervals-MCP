import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { ActivityDetail } from '../../domain/activity';

export interface GetActivityDetailInput {
  activityId: string;
}

export interface GetActivityDetailOutput extends ActivityDetail {
  intervalsTruncated: boolean;
  intervalsShown: number;
  intervalsTotal: number;
}

const MAX_INTERVALS = 50;

@Injectable()
export class GetActivityDetailUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  async execute(
    input: GetActivityDetailInput,
  ): Promise<GetActivityDetailOutput> {
    const detail = await this.intervals.getActivityDetail(input.activityId);
    const intervals = detail.intervals.slice(0, MAX_INTERVALS);
    return {
      ...detail,
      intervals,
      intervalsTruncated: detail.intervals.length > intervals.length,
      intervalsShown: intervals.length,
      intervalsTotal: detail.intervals.length,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { ActivityDetail } from '../../domain/activity';

export interface GetActivityDetailInput {
  activityId: string;
}

@Injectable()
export class GetActivityDetailUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  execute(input: GetActivityDetailInput): Promise<ActivityDetail> {
    return this.intervals.getActivityDetail(input.activityId);
  }
}

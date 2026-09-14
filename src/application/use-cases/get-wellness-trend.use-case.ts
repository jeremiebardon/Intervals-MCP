import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { DateRange } from '../../domain/date-range';
import { Wellness } from '../../domain/wellness';

export interface GetWellnessTrendInput {
  from: string;
  to: string;
}

export interface GetWellnessTrendOutput {
  days: Wellness[];
}

@Injectable()
export class GetWellnessTrendUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  async execute(input: GetWellnessTrendInput): Promise<GetWellnessTrendOutput> {
    const range = DateRange.of(new Date(input.from), new Date(input.to));
    const days = await this.intervals.getWellness(range);
    return { days };
  }
}

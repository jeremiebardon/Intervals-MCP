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
  truncated: boolean;
  shown: number;
  total: number;
  hint: string | null;
}

const MAX_DAYS = 90;

@Injectable()
export class GetWellnessTrendUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  async execute(input: GetWellnessTrendInput): Promise<GetWellnessTrendOutput> {
    const range = DateRange.of(new Date(input.from), new Date(input.to));
    const all = await this.intervals.getWellness(range);
    const days = all.slice(0, MAX_DAYS);
    return {
      days,
      truncated: all.length > days.length,
      shown: days.length,
      total: all.length,
      hint: all.length > days.length ? 'narrow the date range' : null,
    };
  }
}

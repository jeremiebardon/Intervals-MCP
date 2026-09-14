import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  ComparePeriodsUseCase,
  ComparePeriodsInput,
  ComparePeriodsOutput,
} from '../../application/use-cases/compare-periods.use-case';

const periodSchema = z.object({ from: z.string(), to: z.string() });
const inputSchema = z.object({ periodA: periodSchema, periodB: periodSchema });

@Injectable()
export class ComparePeriodsTool implements McpTool<
  ComparePeriodsInput,
  ComparePeriodsOutput
> {
  name = 'compare_periods';
  description =
    'Deltas (periodB minus periodA) in volume, load, and avg HR between two date ranges. ' +
    'Use for "compare this month to last month" style questions.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: ComparePeriodsUseCase) {}

  execute = withToolSpan(this.name, (input: ComparePeriodsInput) =>
    this.useCase.execute(input),
  );
}

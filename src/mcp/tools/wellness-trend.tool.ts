import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetWellnessTrendUseCase,
  GetWellnessTrendInput,
  GetWellnessTrendOutput,
} from '../../application/use-cases/get-wellness-trend.use-case';

const inputSchema = z.object({
  from: z.string().describe('ISO date, inclusive'),
  to: z.string().describe('ISO date, inclusive'),
});

@Injectable()
export class WellnessTrendTool implements McpTool<GetWellnessTrendInput, GetWellnessTrendOutput> {
  name = 'get_wellness_trend';
  description =
    'Daily wellness series (HRV, resting HR, sleep, weight, fatigue) for a date range. ' +
    'Use for trends over days/weeks, not for training load (use get_training_load_summary for that).';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetWellnessTrendUseCase) {}

  execute = withToolSpan(this.name, (input: GetWellnessTrendInput) => this.useCase.execute(input));
}

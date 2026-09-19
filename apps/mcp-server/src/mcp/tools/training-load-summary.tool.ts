import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetTrainingLoadSummaryUseCase,
  GetTrainingLoadSummaryInput,
  GetTrainingLoadSummaryOutput,
} from '../../application/use-cases/get-training-load-summary.use-case';

const inputSchema = z.object({
  weeks: z
    .number()
    .int()
    .positive()
    .max(26)
    .optional()
    .describe('Number of weeks to look back from today. Defaults to 12.'),
});

@Injectable()
export class TrainingLoadSummaryTool implements McpTool<
  GetTrainingLoadSummaryInput,
  GetTrainingLoadSummaryOutput
> {
  name = 'get_training_load_summary';
  description =
    'CTL/ATL/TSB (fitness/fatigue/form) daily rollup plus weekly volume, computed server-side over N weeks. ' +
    'Use for "how has my training load trended" questions. For a list of individual sessions, use get_recent_activities instead.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetTrainingLoadSummaryUseCase) {}

  execute = withToolSpan(this.name, (input: GetTrainingLoadSummaryInput) =>
    this.useCase.execute(input),
  );
}

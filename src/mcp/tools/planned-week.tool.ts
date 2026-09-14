import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetPlannedWeekUseCase,
  GetPlannedWeekInput,
  GetPlannedWeekOutput,
} from '../../application/use-cases/get-planned-week.use-case';

const inputSchema = z.object({
  weekStart: z
    .string()
    .optional()
    .describe(
      'ISO date for the Monday of the target week; defaults to this week',
    ),
});

@Injectable()
export class PlannedWeekTool implements McpTool<
  GetPlannedWeekInput,
  GetPlannedWeekOutput
> {
  name = 'get_planned_week';
  description =
    'Planned workouts from the calendar for one week. Defaults to the current week if weekStart is omitted. ' +
    'Use for "what should I do this week", not for past completed activities.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetPlannedWeekUseCase) {}

  execute = withToolSpan(this.name, (input: GetPlannedWeekInput) =>
    this.useCase.execute(input),
  );
}

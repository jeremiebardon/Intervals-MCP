import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetActivityIntervalsUseCase,
  GetActivityIntervalsInput,
  GetActivityIntervalsOutput,
} from '../../application/use-cases/get-activity-intervals.use-case';

const inputSchema = z.object({
  activityId: z.string(),
});

@Injectable()
export class ActivityIntervalsTool implements McpTool<
  GetActivityIntervalsInput,
  GetActivityIntervalsOutput
> {
  name = 'get_activity_intervals';
  description =
    'Per-km/per-effort interval breakdown for one activity: pace, GAP, power, HR and cadence for each ' +
    'work/recovery interval, plus repeat groups (e.g. 5x1km). Use after get_recent_activities has identified ' +
    'the activityId. Not for browsing multiple sessions.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetActivityIntervalsUseCase) {}

  execute = withToolSpan(this.name, (input: GetActivityIntervalsInput) =>
    this.useCase.execute(input),
  );
}

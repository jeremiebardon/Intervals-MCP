import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetActivityDetailUseCase,
  GetActivityDetailInput,
  GetActivityDetailOutput,
} from '../../application/use-cases/get-activity-detail.use-case';

const inputSchema = z.object({
  activityId: z.string(),
});

@Injectable()
export class ActivityDetailTool implements McpTool<
  GetActivityDetailInput,
  GetActivityDetailOutput
> {
  name = 'get_activity_detail';
  description =
    'Full detail for one activity: intervals/laps and HR zone distribution. ' +
    'Use after get_recent_activities has identified the activityId. Not for browsing multiple sessions.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetActivityDetailUseCase) {}

  execute = withToolSpan(this.name, (input: GetActivityDetailInput) =>
    this.useCase.execute(input),
  );
}

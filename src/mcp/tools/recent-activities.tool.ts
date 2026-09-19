import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetRecentActivitiesUseCase,
  GetRecentActivitiesInput,
  GetRecentActivitiesOutput,
} from '../../application/use-cases/get-recent-activities.use-case';

const inputSchema = z.object({
  from: z
    .string()
    .optional()
    .describe('ISO date, inclusive. Defaults to 7 days before `to`.'),
  to: z.string().optional().describe('ISO date, inclusive. Defaults to today.'),
  sport: z
    .string()
    .optional()
    .describe('Filter by sport, e.g. "Ride" or "Run"'),
  limit: z.number().int().positive().max(50).optional(),
});

@Injectable()
export class RecentActivitiesTool implements McpTool<
  GetRecentActivitiesInput,
  GetRecentActivitiesOutput
> {
  name = 'get_recent_activities';
  description =
    'List recent activities in a date range with compact summaries (date, name, distance, duration, avg HR, pace, load). ' +
    'Use for browsing sessions over days/weeks. For full detail on one session (intervals, HR zones), use get_activity_detail.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetRecentActivitiesUseCase) {}

  execute = withToolSpan(this.name, (input: GetRecentActivitiesInput) =>
    this.useCase.execute(input),
  );
}

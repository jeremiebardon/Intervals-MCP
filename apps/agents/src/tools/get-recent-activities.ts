import { z } from 'zod';
import { DateRange } from '../lib/date-range';
import { Activity } from '../infrastructure/intervals/types';
import { defineTool, ToolDeps } from './define-tool';

export interface GetRecentActivitiesInput {
  from?: string;
  to?: string;
  sport?: string;
  limit?: number;
}

export interface GetRecentActivitiesOutput {
  activities: Activity[];
  truncated: boolean;
  shown: number;
  total: number;
  hint: string | null;
}

const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_LIMIT = 20;

export async function getRecentActivities(
  { intervals, now }: ToolDeps,
  input: GetRecentActivitiesInput,
): Promise<GetRecentActivitiesOutput> {
  const to = input.to ? new Date(input.to) : now();
  const from = input.from
    ? new Date(input.from)
    : new Date(to.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const all = await intervals.getActivities(
    DateRange.of(from, to),
    input.sport,
  );
  const activities = all.slice(0, input.limit ?? DEFAULT_LIMIT);
  const truncated = all.length > activities.length;
  return {
    activities,
    truncated,
    shown: activities.length,
    total: all.length,
    hint: truncated ? 'narrow the date range' : null,
  };
}

export const recentActivitiesTool = defineTool({
  name: 'get_recent_activities',
  description:
    'List recent activities in a date range with summaries (date, name, distance, duration, avg/max HR, pace/speed/GAP, power, ' +
    'cadence, elevation, calories, training load, intensity, TRIMP, CTL/ATL fitness context, decoupling, efficiency factor, ' +
    'and subjective feedback like RPE/feel). ' +
    'Use for browsing sessions over days/weeks. For full detail on one session (intervals, HR zones), use get_activity_detail. ' +
    'This should not be used as a performance indicator alone, depending the load of the activity you could retrieve more intervals/activity detail with get_activity_detail',
  schema: z.object({
    from: z
      .string()
      .optional()
      .describe('ISO date, inclusive. Defaults to 7 days before `to`.'),
    to: z
      .string()
      .optional()
      .describe('ISO date, inclusive. Defaults to today.'),
    sport: z
      .string()
      .optional()
      .describe('Filter by sport, e.g. "Ride" or "Run"'),
    limit: z.number().int().positive().max(50).optional(),
  }),
  run: getRecentActivities,
});

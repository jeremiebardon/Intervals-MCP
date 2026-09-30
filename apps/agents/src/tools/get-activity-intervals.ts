import { z } from 'zod';
import {
  ActivityIntervalGroup,
  ActivityIntervalStat,
} from '../infrastructure/intervals/types';
import { defineTool, ToolDeps } from './define-tool';

export interface GetActivityIntervalsInput {
  activityId: string;
}

export interface GetActivityIntervalsOutput {
  intervals: ActivityIntervalStat[];
  groups: ActivityIntervalGroup[];
  intervalsTruncated: boolean;
  intervalsShown: number;
  intervalsTotal: number;
}

const MAX_INTERVALS = 50;

export async function getActivityIntervals(
  { intervals }: ToolDeps,
  input: GetActivityIntervalsInput,
): Promise<GetActivityIntervalsOutput> {
  const result = await intervals.getActivityIntervals(input.activityId);
  const shown = result.intervals.slice(0, MAX_INTERVALS);
  return {
    intervals: shown,
    groups: result.groups,
    intervalsTruncated: result.intervals.length > shown.length,
    intervalsShown: shown.length,
    intervalsTotal: result.intervals.length,
  };
}

export const activityIntervalsTool = defineTool({
  name: 'get_activity_intervals',
  description:
    'Per-km/per-effort interval breakdown for one activity: pace, GAP, power, HR and cadence for each ' +
    'work/recovery interval, plus repeat groups (e.g. 5x1km). Use after get_recent_activities has identified ' +
    'the activityId. Not for browsing multiple sessions.',
  schema: z.object({ activityId: z.string() }),
  run: getActivityIntervals,
});

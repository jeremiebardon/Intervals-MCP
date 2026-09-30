import { z } from 'zod';
import { ActivityDetail } from '../infrastructure/intervals/types';
import { defineTool, ToolDeps } from './define-tool';

export interface GetActivityDetailInput {
  activityId: string;
}

export interface GetActivityDetailOutput extends ActivityDetail {
  intervalsTruncated: boolean;
  intervalsShown: number;
  intervalsTotal: number;
}

const MAX_INTERVALS = 50;

export async function getActivityDetail(
  { intervals }: ToolDeps,
  input: GetActivityDetailInput,
): Promise<GetActivityDetailOutput> {
  const detail = await intervals.getActivityDetail(input.activityId);
  const shown = detail.intervals.slice(0, MAX_INTERVALS);
  return {
    ...detail,
    intervals: shown,
    intervalsTruncated: detail.intervals.length > shown.length,
    intervalsShown: shown.length,
    intervalsTotal: detail.intervals.length,
  };
}

export const activityDetailTool = defineTool({
  name: 'get_activity_detail',
  description:
    'Full detail for one activity: intervals/laps and HR zone distribution. ' +
    'Use after get_recent_activities has identified the activityId. Not for browsing multiple sessions.',
  schema: z.object({ activityId: z.string() }),
  run: getActivityDetail,
});

import { ToolDeps } from './define-tool';
import { recentActivitiesTool } from './get-recent-activities';
import { activityDetailTool } from './get-activity-detail';
import { activityIntervalsTool } from './get-activity-intervals';
import { wellnessTrendTool } from './get-wellness-trend';
import { plannedWeekTool } from './get-planned-week';
import { trainingLoadSummaryTool } from './get-training-load-summary';
import { comparePeriodsTool } from './compare-periods';
import { racePaceTool } from './calculate-race-pace';
import { weeklyTotalsTool } from './get-weekly-totals';

export type { ToolDeps } from './define-tool';

export function createTools(deps: ToolDeps) {
  return [
    recentActivitiesTool(deps),
    activityDetailTool(deps),
    activityIntervalsTool(deps),
    wellnessTrendTool(deps),
    plannedWeekTool(deps),
    trainingLoadSummaryTool(deps),
    comparePeriodsTool(deps),
    racePaceTool(deps),
    weeklyTotalsTool(deps),
  ];
}

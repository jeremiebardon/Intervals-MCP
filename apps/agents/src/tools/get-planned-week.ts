import { z } from 'zod';
import { DateRange } from '../lib/date-range';
import { PlannedWorkout } from '../infrastructure/intervals/types';
import { defineTool, ToolDeps } from './define-tool';

export interface GetPlannedWeekInput {
  weekStart?: string;
}

export interface GetPlannedWeekOutput {
  workouts: PlannedWorkout[];
}

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // Monday as start of week
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - diff);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export async function getPlannedWeek(
  { intervals, now }: ToolDeps,
  input: GetPlannedWeekInput,
): Promise<GetPlannedWeekOutput> {
  const from = input.weekStart ? new Date(input.weekStart) : startOfWeek(now());
  const to = new Date(from);
  to.setUTCDate(from.getUTCDate() + 6);
  const workouts = await intervals.getPlannedWorkouts(DateRange.of(from, to));
  return { workouts };
}

export const plannedWeekTool = defineTool({
  name: 'get_planned_week',
  description:
    'Planned workouts from the calendar for one week. Defaults to the current week if weekStart is omitted. ' +
    'Use for "what should I do this week", not for past completed activities.',
  schema: z.object({
    weekStart: z
      .string()
      .optional()
      .describe(
        'ISO date for the Monday of the target week; defaults to this week',
      ),
  }),
  run: getPlannedWeek,
});

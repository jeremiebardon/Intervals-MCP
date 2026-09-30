import { z } from 'zod';
import { DateRange } from '../lib/date-range';
import { defineTool, ToolDeps } from './define-tool';
import { addDays, weekBounds } from '../lib/week';

export interface GetWeeklyTotalsInput {
  weeks?: number;
  sport?: string;
}

export interface WeeklyTotal {
  weekStart: string;
  weekEnd: string;
  /** True for the week that contains today and has not ended yet. */
  partial: boolean;
  sessions: number;
  distanceKm: number;
  durationSeconds: number;
  trainingLoad: number;
}

export interface GetWeeklyTotalsOutput {
  today: string;
  weeks: WeeklyTotal[];
  total: Omit<WeeklyTotal, 'weekStart' | 'weekEnd' | 'partial'>;
}

const DEFAULT_WEEKS = 4;

function km(meters: number): number {
  return Math.round(meters / 10) / 100;
}

export async function getWeeklyTotals(
  { intervals, now }: ToolDeps,
  input: GetWeeklyTotalsInput,
): Promise<GetWeeklyTotalsOutput> {
  const weekCount = input.weeks ?? DEFAULT_WEEKS;
  const current = now();
  const today = current.toISOString().slice(0, 10);
  const firstWeekStart = addDays(weekBounds(today).start, -(weekCount - 1) * 7);

  const range = DateRange.of(new Date(`${firstWeekStart}T00:00:00Z`), current);
  const activities = await intervals.getActivities(range, input.sport);

  const buckets = new Map<
    string,
    { sessions: number; meters: number; seconds: number; load: number }
  >();
  for (let i = 0; i < weekCount; i++) {
    buckets.set(addDays(firstWeekStart, i * 7), {
      sessions: 0,
      meters: 0,
      seconds: 0,
      load: 0,
    });
  }
  for (const activity of activities) {
    const bucket = buckets.get(weekBounds(activity.date.slice(0, 10)).start);
    if (!bucket) continue;
    bucket.sessions += 1;
    bucket.meters += activity.distanceMeters;
    bucket.seconds += activity.durationSeconds;
    bucket.load += activity.trainingLoad ?? 0;
  }

  const weeks: WeeklyTotal[] = [];
  const sum = { sessions: 0, meters: 0, seconds: 0, load: 0 };
  for (const [weekStart, bucket] of buckets) {
    const weekEnd = addDays(weekStart, 6);
    weeks.push({
      weekStart,
      weekEnd,
      partial: weekEnd > today,
      sessions: bucket.sessions,
      distanceKm: km(bucket.meters),
      durationSeconds: bucket.seconds,
      trainingLoad: bucket.load,
    });
    sum.sessions += bucket.sessions;
    sum.meters += bucket.meters;
    sum.seconds += bucket.seconds;
    sum.load += bucket.load;
  }

  return {
    today,
    weeks,
    total: {
      sessions: sum.sessions,
      distanceKm: km(sum.meters),
      durationSeconds: sum.seconds,
      trainingLoad: sum.load,
    },
  };
}

export const weeklyTotalsTool = defineTool({
  name: 'get_weekly_totals',
  description:
    'Exact per-week totals (sessions, distance in km, duration, training load) for Monday-to-Sunday weeks ending with the current one, ' +
    "plus the grand total and each week's start/end dates. The current week is flagged partial. " +
    'Use for "how far did I run this week / last N weeks" questions instead of adding up activities yourself. ' +
    'For CTL/ATL/TSB trends use get_training_load_summary.',
  schema: z.object({
    weeks: z
      .number()
      .int()
      .positive()
      .max(26)
      .optional()
      .describe(
        'Number of Monday-to-Sunday weeks to report, ending with the current week. Defaults to 4.',
      ),
    sport: z
      .string()
      .optional()
      .describe(
        'Only count this sport, e.g. "Run" or "Ride". Defaults to all sports.',
      ),
  }),
  run: getWeeklyTotals,
});

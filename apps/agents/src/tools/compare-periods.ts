import { z } from 'zod';
import { DateRange } from '../lib/date-range';
import { Activity } from '../infrastructure/intervals/types';
import { defineTool, ToolDeps } from './define-tool';

export interface PeriodInput {
  from: string;
  to: string;
}

export interface ComparePeriodsInput {
  periodA: PeriodInput;
  periodB: PeriodInput;
}

export interface PeriodDeltas {
  distanceMeters: number;
  durationSeconds: number;
  trainingLoad: number;
  avgHeartRate: number | null;
}

export interface ComparePeriodsOutput {
  deltas: PeriodDeltas;
}

function sumBy(
  activities: Activity[],
  select: (a: Activity) => number,
): number {
  return activities.reduce((sum, a) => sum + select(a), 0);
}

function avgHeartRate(activities: Activity[]): number | null {
  const withHr = activities.filter((a) => a.avgHeartRate !== null);
  if (withHr.length === 0) return null;
  return sumBy(withHr, (a) => a.avgHeartRate as number) / withHr.length;
}

export async function comparePeriods(
  { intervals }: ToolDeps,
  input: ComparePeriodsInput,
): Promise<ComparePeriodsOutput> {
  const rangeA = DateRange.of(
    new Date(input.periodA.from),
    new Date(input.periodA.to),
  );
  const rangeB = DateRange.of(
    new Date(input.periodB.from),
    new Date(input.periodB.to),
  );

  const [activitiesA, activitiesB] = await Promise.all([
    intervals.getActivities(rangeA),
    intervals.getActivities(rangeB),
  ]);

  const hrA = avgHeartRate(activitiesA);
  const hrB = avgHeartRate(activitiesB);

  return {
    deltas: {
      distanceMeters:
        sumBy(activitiesB, (a) => a.distanceMeters) -
        sumBy(activitiesA, (a) => a.distanceMeters),
      durationSeconds:
        sumBy(activitiesB, (a) => a.durationSeconds) -
        sumBy(activitiesA, (a) => a.durationSeconds),
      trainingLoad:
        sumBy(activitiesB, (a) => a.trainingLoad ?? 0) -
        sumBy(activitiesA, (a) => a.trainingLoad ?? 0),
      avgHeartRate: hrA !== null && hrB !== null ? hrB - hrA : null,
    },
  };
}

const periodSchema = z.object({ from: z.string(), to: z.string() });

export const comparePeriodsTool = defineTool({
  name: 'compare_periods',
  description:
    'Deltas (periodB minus periodA) in volume, load, and avg HR between two date ranges. ' +
    'Use for "compare this month to last month" style questions.',
  schema: z.object({ periodA: periodSchema, periodB: periodSchema }),
  run: comparePeriods,
});

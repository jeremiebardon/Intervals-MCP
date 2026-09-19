import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { DateRange } from '../../domain/date-range';
import { Activity } from '../../domain/activity';

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

@Injectable()
export class ComparePeriodsUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  async execute(input: ComparePeriodsInput): Promise<ComparePeriodsOutput> {
    const rangeA = DateRange.of(
      new Date(input.periodA.from),
      new Date(input.periodA.to),
    );
    const rangeB = DateRange.of(
      new Date(input.periodB.from),
      new Date(input.periodB.to),
    );

    const [activitiesA, activitiesB] = await Promise.all([
      this.intervals.getActivities(rangeA),
      this.intervals.getActivities(rangeB),
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
}

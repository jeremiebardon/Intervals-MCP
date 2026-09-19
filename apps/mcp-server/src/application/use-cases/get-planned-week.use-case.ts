import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { ClockPort } from '../ports/clock.port';
import { DateRange } from '../../domain/date-range';
import { PlannedWorkout } from '../../domain/planned-workout';

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

@Injectable()
export class GetPlannedWeekUseCase {
  constructor(
    private readonly intervals: IntervalsPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: GetPlannedWeekInput): Promise<GetPlannedWeekOutput> {
    const from = input.weekStart
      ? new Date(input.weekStart)
      : startOfWeek(this.clock.now());
    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 6);
    const range = DateRange.of(from, to);
    const workouts = await this.intervals.getPlannedWorkouts(range);
    return { workouts };
  }
}

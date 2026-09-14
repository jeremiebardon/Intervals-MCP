import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { ClockPort } from '../ports/clock.port';
import { DateRange } from '../../domain/date-range';
import { TrainingLoad } from '../../domain/activity';

export interface GetTrainingLoadSummaryInput {
  weeks: number;
}

export interface WeeklyVolume {
  weekStart: string;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
}

export interface GetTrainingLoadSummaryOutput {
  points: TrainingLoad[];
  weeklyVolume: WeeklyVolume[];
}

const CTL_DAYS = 42;
const ATL_DAYS = 7;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekStartOf(isoDate: string): string {
  const d = new Date(isoDate);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return isoDay(d);
}

@Injectable()
export class GetTrainingLoadSummaryUseCase {
  constructor(
    private readonly intervals: IntervalsPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: GetTrainingLoadSummaryInput): Promise<GetTrainingLoadSummaryOutput> {
    const to = this.clock.now();
    const from = new Date(to);
    from.setUTCDate(to.getUTCDate() - input.weeks * 7);
    const range = DateRange.of(from, to);

    const activities = await this.intervals.getActivities(range);

    const loadByDay = new Map<string, number>();
    for (const activity of activities) {
      const day = activity.date.slice(0, 10);
      loadByDay.set(day, (loadByDay.get(day) ?? 0) + (activity.trainingLoad ?? 0));
    }

    const days: string[] = [];
    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(isoDay(d));
    }

    const ctlAlpha = 2 / (CTL_DAYS + 1);
    const atlAlpha = 2 / (ATL_DAYS + 1);
    let ctl = 0;
    let atl = 0;
    const points: TrainingLoad[] = days.map((day) => {
      const load = loadByDay.get(day) ?? 0;
      ctl = ctl + ctlAlpha * (load - ctl);
      atl = atl + atlAlpha * (load - atl);
      return { date: day, ctl: Math.round(ctl * 10) / 10, atl: Math.round(atl * 10) / 10, tsb: Math.round((ctl - atl) * 10) / 10 };
    });

    const volumeByWeek = new Map<string, WeeklyVolume>();
    for (const activity of activities) {
      const week = weekStartOf(activity.date.slice(0, 10));
      const existing = volumeByWeek.get(week) ?? { weekStart: week, totalDurationSeconds: 0, totalDistanceMeters: 0 };
      existing.totalDurationSeconds += activity.durationSeconds;
      existing.totalDistanceMeters += activity.distanceMeters;
      volumeByWeek.set(week, existing);
    }

    return {
      points,
      weeklyVolume: Array.from(volumeByWeek.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    };
  }
}

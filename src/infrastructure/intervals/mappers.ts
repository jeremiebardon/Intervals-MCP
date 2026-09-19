import {
  Activity,
  ActivityDetail,
  ActivityIntervalGroup,
  ActivityIntervalStat,
  ActivityIntervals,
} from '../../domain/activity';
import { Wellness } from '../../domain/wellness';
import { PlannedWorkout } from '../../domain/planned-workout';
import {
  ActivityApiResponse,
  ActivityDetailApiResponse,
  ActivityIntervalsApiResponse,
  WellnessApiResponse,
  PlannedWorkoutApiResponse,
} from './schemas';

export function toActivity(api: ActivityApiResponse): Activity {
  return {
    id: api.id,
    date: api.start_date_local,
    name: api.name,
    sport: api.type,
    distanceMeters: api.distance ?? 0,
    durationSeconds: api.moving_time ?? 0,
    avgHeartRate: api.icu_average_hr,
    avgPace: api.icu_pace,
    trainingLoad: api.icu_training_load,
  };
}

export function toActivityDetail(
  api: ActivityDetailApiResponse,
): ActivityDetail {
  return {
    ...toActivity(api),
    intervals: api.intervals.map((i) => ({
      label: i.label,
      durationSeconds: i.duration,
      distanceMeters: i.distance,
      avgHeartRate: i.average_heartrate,
      avgPower: i.average_watts,
    })),
    hrZoneDistribution: {
      zone1Seconds: api.hr_zone_distribution.z1_secs,
      zone2Seconds: api.hr_zone_distribution.z2_secs,
      zone3Seconds: api.hr_zone_distribution.z3_secs,
      zone4Seconds: api.hr_zone_distribution.z4_secs,
      zone5Seconds: api.hr_zone_distribution.z5_secs,
    },
  };
}

function toActivityIntervalStat(
  api: ActivityIntervalsApiResponse['icu_intervals'][number],
): ActivityIntervalStat {
  return {
    id: api.id,
    groupId: api.group_id,
    label: api.label,
    type: api.type,
    durationSeconds: api.moving_time,
    distanceMeters: api.distance,
    avgHeartRate: api.average_heartrate,
    maxHeartRate: api.max_heartrate,
    avgPower: api.average_watts,
    avgPaceMetersPerSecond: api.average_speed,
    gapMetersPerSecond: api.gap,
    avgCadence: api.average_cadence,
    elevationGainMeters: api.total_elevation_gain,
    trainingLoad: api.training_load,
    zone: api.zone,
  };
}

function toActivityIntervalGroup(
  api: ActivityIntervalsApiResponse['icu_groups'][number],
): ActivityIntervalGroup {
  return {
    id: api.id,
    count: api.count,
    durationSeconds: api.moving_time,
    distanceMeters: api.distance,
    avgHeartRate: api.average_heartrate,
    avgPower: api.average_watts,
    avgPaceMetersPerSecond: api.average_speed,
  };
}

export function toActivityIntervals(
  api: ActivityIntervalsApiResponse,
): ActivityIntervals {
  return {
    intervals: api.icu_intervals.map(toActivityIntervalStat),
    groups: api.icu_groups.map(toActivityIntervalGroup),
  };
}

export function toWellness(api: WellnessApiResponse): Wellness {
  return {
    date: api.id,
    hrv: api.hrv,
    restingHeartRate: api.restingHR,
    sleepHours: api.sleepSecs !== null ? api.sleepSecs / 3600 : null,
    weightKg: api.weight,
    fatigue: api.fatigue,
  };
}

export function toPlannedWorkout(
  api: PlannedWorkoutApiResponse,
): PlannedWorkout {
  return {
    id: api.id,
    date: api.start_date_local,
    name: api.name,
    sport: api.type,
    description: api.description,
    plannedDurationSeconds: api.moving_time,
    plannedDistanceMeters: api.distance,
  };
}

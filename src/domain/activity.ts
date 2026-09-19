export type ActivityId = string;

export interface Activity {
  id: ActivityId;
  date: string;
  name: string;
  sport: string;
  distanceMeters: number;
  durationSeconds: number;
  avgHeartRate: number | null;
  avgPace: number | null;
  trainingLoad: number | null;
}

export interface ActivityInterval {
  label: string;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  avgPower: number | null;
}

export interface HrZoneDistribution {
  zone1Seconds: number;
  zone2Seconds: number;
  zone3Seconds: number;
  zone4Seconds: number;
  zone5Seconds: number;
}

export interface ActivityDetail extends Activity {
  intervals: ActivityInterval[];
  hrZoneDistribution: HrZoneDistribution;
}

export interface ActivityIntervalStat {
  id: number;
  groupId: string | null;
  label: string | null;
  type: 'WORK' | 'RECOVERY';
  durationSeconds: number;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgPower: number | null;
  avgPaceMetersPerSecond: number | null;
  gapMetersPerSecond: number | null;
  avgCadence: number | null;
  elevationGainMeters: number | null;
  trainingLoad: number | null;
  zone: number | null;
}

export interface ActivityIntervalGroup {
  id: string;
  count: number | null;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  avgPower: number | null;
  avgPaceMetersPerSecond: number | null;
}

export interface ActivityIntervals {
  intervals: ActivityIntervalStat[];
  groups: ActivityIntervalGroup[];
}

export interface TrainingLoad {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

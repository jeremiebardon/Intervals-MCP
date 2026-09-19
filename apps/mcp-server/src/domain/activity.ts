export type ActivityId = string;

export interface Activity {
  id: ActivityId;
  date: string;
  name: string;
  sport: string;
  description: string | null;
  distanceMeters: number;
  durationSeconds: number;
  elapsedSeconds: number | null;
  /** Human-readable summary of laps/intervals, e.g. "10x 4m55s 148bpm". */
  intervalSummary: string[];
  /** Average heart rate in bpm. */
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  /** Average pace in meters/second (moving-time based). */
  avgPace: number | null;
  /** Average speed in meters/second (elapsed-time based, may differ slightly from avgPace). */
  avgSpeedMetersPerSecond: number | null;
  /** Grade-adjusted pace in meters/second. */
  gapMetersPerSecond: number | null;
  avgPowerWatts: number | null;
  weightedAvgPowerWatts: number | null;
  trainingLoad: number | null;
  /** Relative intensity of the session (0-100+ scale). */
  intensity: number | null;
  trimp: number | null;
  /** Chronic training load (fitness) at the time of the activity. */
  ctl: number | null;
  /** Acute training load (fatigue) at the time of the activity. */
  atl: number | null;
  /** Aerobic decoupling percentage; higher values suggest fatigue/poor pacing. */
  decoupling: number | null;
  efficiencyFactor: number | null;
  /** Perceived exertion reported by the athlete (RPE). */
  perceivedExertion: number | null;
  icuRpe: number | null;
  /** Subjective feel of the session (1 = best, 5 = worst). */
  feel: number | null;
  sessionRpe: number | null;
  avgCadence: number | null;
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  calories: number | null;
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

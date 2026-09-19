import { z } from 'zod';

export const activitySchema = z.object({
  id: z.string(),
  start_date_local: z.string(),
  name: z.string(),
  type: z.string(),
  distance: z.number().nullable(),
  moving_time: z.number().nullable(),
  icu_average_hr: z
    .number()
    .nullish()
    .transform((v) => v ?? null),
  icu_pace: z
    .number()
    .nullish()
    .transform((v) => v ?? null),
  icu_training_load: z.number().nullable(),
});

export type ActivityApiResponse = z.infer<typeof activitySchema>;

export const activitiesResponseSchema = z.array(activitySchema);

export const activityIntervalSchema = z.object({
  label: z.string(),
  duration: z.number(),
  distance: z.number().nullable(),
  average_heartrate: z.number().nullable(),
  average_watts: z.number().nullable(),
});

export const hrZoneDistributionSchema = z.object({
  z1_secs: z.number(),
  z2_secs: z.number(),
  z3_secs: z.number(),
  z4_secs: z.number(),
  z5_secs: z.number(),
});

export const activityDetailSchema = activitySchema.extend({
  intervals: z.array(activityIntervalSchema).default([]),
  hr_zone_distribution: hrZoneDistributionSchema,
});
export type ActivityDetailApiResponse = z.infer<typeof activityDetailSchema>;

export const intervalStatSchema = z.object({
  id: z.number(),
  group_id: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  label: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  type: z.enum(['WORK', 'RECOVERY']),
  moving_time: z.number(),
  distance: z.number().nullable(),
  average_heartrate: z.number().nullable(),
  max_heartrate: z.number().nullable(),
  average_watts: z.number().nullable(),
  average_speed: z.number().nullable(),
  gap: z.number().nullable(),
  average_cadence: z.number().nullable(),
  total_elevation_gain: z.number().nullable(),
  training_load: z.number().nullable(),
  zone: z.number().nullable(),
});
export type IntervalStatApiResponse = z.infer<typeof intervalStatSchema>;

export const intervalGroupSchema = z.object({
  id: z.string(),
  count: z.number().nullable(),
  moving_time: z.number(),
  distance: z.number().nullable(),
  average_heartrate: z.number().nullable(),
  average_watts: z.number().nullable(),
  average_speed: z.number().nullable(),
});
export type IntervalGroupApiResponse = z.infer<typeof intervalGroupSchema>;

export const activityIntervalsResponseSchema = z.object({
  icu_intervals: z.array(intervalStatSchema).default([]),
  icu_groups: z.array(intervalGroupSchema).default([]),
});
export type ActivityIntervalsApiResponse = z.infer<
  typeof activityIntervalsResponseSchema
>;

export const wellnessSchema = z.object({
  id: z.string(),
  hrv: z.number().nullable(),
  restingHR: z.number().nullable(),
  sleepSecs: z.number().nullable(),
  weight: z.number().nullable(),
  fatigue: z.number().nullable(),
});

export type WellnessApiResponse = z.infer<typeof wellnessSchema>;

export const wellnessResponseSchema = z.array(wellnessSchema);

export const plannedWorkoutSchema = z.object({
  id: z.string(),
  start_date_local: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  moving_time: z.number().nullable(),
  distance: z.number().nullable(),
});
export type PlannedWorkoutApiResponse = z.infer<typeof plannedWorkoutSchema>;

export const plannedWorkoutsResponseSchema = z.array(plannedWorkoutSchema);

import { z } from 'zod';

export const activitySchema = z.object({
  id: z.string(),
  start_date_local: z.string(),
  name: z.string(),
  type: z.string(),
  distance: z.number().nullable(),
  moving_time: z.number().nullable(),
  icu_average_hr: z.number().nullable(),
  icu_pace: z.number().nullable(),
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

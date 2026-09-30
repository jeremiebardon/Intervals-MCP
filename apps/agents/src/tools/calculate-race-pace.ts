import { z } from 'zod';
import { parseTargetTime, requiredPace, RequiredPace } from '../lib/pace';
import { defineTool } from './define-tool';

export interface CalculateRacePaceInput {
  distanceKm: number;
  targetTime: string;
}

export interface CalculateRacePaceOutput extends RequiredPace {
  distanceKm: number;
  targetTime: string;
  targetTimeSeconds: number;
}

export function calculateRacePace(
  input: CalculateRacePaceInput,
): CalculateRacePaceOutput {
  const targetTimeSeconds = parseTargetTime(input.targetTime);
  return {
    distanceKm: input.distanceKm,
    targetTime: input.targetTime,
    targetTimeSeconds,
    ...requiredPace(input.distanceKm, targetTimeSeconds),
  };
}

export const racePaceTool = defineTool({
  name: 'calculate_race_pace',
  description:
    'Exact average pace (min/km, formatted m:ss) and speed (km/h) needed to cover a distance in a target time. ' +
    'Use for "what pace do I need for a 1h25 half marathon" questions instead of computing it yourself. ' +
    'This does not read training data; compare its result with paces from get_recent_activities.',
  schema: z.object({
    distanceKm: z
      .number()
      .positive()
      .max(500)
      .describe(
        'Race distance in kilometres, e.g. 5, 10, 21.0975 (half marathon), 42.195 (marathon).',
      ),
    targetTime: z
      .string()
      .regex(/^\d{1,2}:[0-5]\d(:[0-5]\d)?$/)
      .describe(
        'Target finish time as H:MM:SS or MM:SS, e.g. "1:25:00" or "19:30".',
      ),
  }),
  run: (_deps, input) => calculateRacePace(input),
});

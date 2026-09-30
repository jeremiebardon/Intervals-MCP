import { z } from 'zod';
import { DateRange } from '../lib/date-range';
import { Wellness } from '../infrastructure/intervals/types';
import { defineTool, ToolDeps } from './define-tool';

export interface GetWellnessTrendInput {
  from: string;
  to: string;
}

export interface GetWellnessTrendOutput {
  days: Wellness[];
  truncated: boolean;
  shown: number;
  total: number;
  hint: string | null;
}

const MAX_DAYS = 90;

export async function getWellnessTrend(
  { intervals }: ToolDeps,
  input: GetWellnessTrendInput,
): Promise<GetWellnessTrendOutput> {
  const range = DateRange.of(new Date(input.from), new Date(input.to));
  const all = await intervals.getWellness(range);
  const days = all.slice(0, MAX_DAYS);
  return {
    days,
    truncated: all.length > days.length,
    shown: days.length,
    total: all.length,
    hint: all.length > days.length ? 'narrow the date range' : null,
  };
}

export const wellnessTrendTool = defineTool({
  name: 'get_wellness_trend',
  description:
    'Daily wellness series (HRV, resting HR, sleep, weight, fatigue) for a date range. ' +
    'Use for trends over days/weeks, not for training load (use get_training_load_summary for that).',
  schema: z.object({
    from: z.string().describe('ISO date, inclusive'),
    to: z.string().describe('ISO date, inclusive'),
  }),
  run: getWellnessTrend,
});

import { readFileSync } from 'fs';
import { join } from 'path';
import { wellnessResponseSchema } from '../../src/infrastructure/intervals/schemas';
import { toWellness } from '../../src/infrastructure/intervals/mappers';

describe('intervals.icu wellness contract', () => {
  it('parses and maps the wellness fixture', () => {
    const raw: unknown = JSON.parse(
      readFileSync(join(__dirname, '../../fixtures/wellness.json'), 'utf-8'),
    );
    const parsed = wellnessResponseSchema.parse(raw);
    const days = parsed.map(toWellness);
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ date: '2026-09-01', hrv: 62 });
    expect(days[1].sleepHours).toBeNull();
  });
});

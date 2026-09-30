import { weekBounds } from '../week';

describe('weekBounds', () => {
  it('returns Monday to Sunday for a mid-week date', () => {
    expect(weekBounds('2026-09-16')).toEqual({
      start: '2026-09-14',
      end: '2026-09-20',
    });
  });

  it('treats Sunday as the last day of its week', () => {
    expect(weekBounds('2026-09-20')).toEqual({
      start: '2026-09-14',
      end: '2026-09-20',
    });
  });

  it('treats Monday as the first day of its week', () => {
    expect(weekBounds('2026-09-14')).toEqual({
      start: '2026-09-14',
      end: '2026-09-20',
    });
  });

  it('crosses month and year boundaries', () => {
    expect(weekBounds('2026-01-01')).toEqual({
      start: '2025-12-29',
      end: '2026-01-04',
    });
  });
});

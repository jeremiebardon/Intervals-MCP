import { currentDateLine } from '../current-date';

describe('currentDateLine', () => {
  it('gives the weekday and the ISO date', () => {
    expect(currentDateLine(new Date('2026-09-20T10:00:00Z'))).toBe(
      "Today's date: Sunday 2026-09-20",
    );
  });

  it('uses the UTC calendar day', () => {
    expect(currentDateLine(new Date('2026-09-21T00:30:00Z'))).toBe(
      "Today's date: Monday 2026-09-21",
    );
  });
});

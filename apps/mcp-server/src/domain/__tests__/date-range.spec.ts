import { DateRange } from '../date-range';

describe('DateRange', () => {
  it('accepts from <= to', () => {
    const range = DateRange.of(new Date('2026-01-01'), new Date('2026-01-31'));
    expect(range.from).toEqual(new Date('2026-01-01'));
    expect(range.to).toEqual(new Date('2026-01-31'));
  });

  it('accepts from === to', () => {
    const day = new Date('2026-01-01');
    const range = DateRange.of(day, day);
    expect(range.from).toEqual(day);
  });

  it('rejects from > to', () => {
    expect(() =>
      DateRange.of(new Date('2026-02-01'), new Date('2026-01-01')),
    ).toThrow(/must be <=/);
  });

  it('rejects invalid dates', () => {
    expect(() =>
      DateRange.of(new Date('not a date'), new Date('2026-01-01')),
    ).toThrow(/must be valid/);
  });
});

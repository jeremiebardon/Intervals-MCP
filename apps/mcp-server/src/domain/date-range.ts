export class DateRange {
  private constructor(
    readonly from: Date,
    readonly to: Date,
  ) {}

  static of(from: Date, to: Date): DateRange {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new Error(
        `DateRange: both dates must be valid (got from=${String(from)}, to=${String(to)})`,
      );
    }
    if (from.getTime() > to.getTime()) {
      throw new Error(
        `DateRange: from (${from.toISOString()}) must be <= to (${to.toISOString()})`,
      );
    }
    return new DateRange(from, to);
  }
}

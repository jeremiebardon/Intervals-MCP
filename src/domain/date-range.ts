export class DateRange {
  private constructor(
    readonly from: Date,
    readonly to: Date,
  ) {}

  static of(from: Date, to: Date): DateRange {
    if (from.getTime() > to.getTime()) {
      throw new Error(
        `DateRange: from (${from.toISOString()}) must be <= to (${to.toISOString()})`,
      );
    }
    return new DateRange(from, to);
  }
}

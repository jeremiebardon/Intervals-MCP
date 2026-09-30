export interface WeekBounds {
  /** Monday, YYYY-MM-DD. */
  start: string;
  /** Sunday, YYYY-MM-DD. */
  end: string;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday-to-Sunday week containing the given YYYY-MM-DD date. */
export function weekBounds(isoDate: string): WeekBounds {
  const daysSinceMonday =
    (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(isoDate, -daysSinceMonday);
  return { start, end: addDays(start, 6) };
}

import { getWeeklyTotals } from '../get-weekly-totals';
import { IntervalsClient } from '../../infrastructure/intervals/intervals.client';
import { Activity } from '../../infrastructure/intervals/types';

function run(
  date: string,
  distanceMeters: number,
  durationSeconds = 3600,
  load = 50,
): Activity {
  return {
    id: date + distanceMeters,
    date,
    name: 'Run',
    sport: 'Run',
    distanceMeters,
    durationSeconds,
    trainingLoad: load,
  } as Activity;
}

function build(activities: Activity[], now: string) {
  const getActivities = jest
    .fn<
      ReturnType<IntervalsClient['getActivities']>,
      Parameters<IntervalsClient['getActivities']>
    >()
    .mockResolvedValue(activities);
  const port = { getActivities } as unknown as IntervalsClient;
  const deps = { intervals: port, now: () => new Date(now) };
  return { deps, getActivities };
}

describe('getWeeklyTotals', () => {
  it('returns Monday-aligned weeks ending with the current one, empty weeks included', async () => {
    const { deps } = build(
      [run('2026-09-15T07:00:00', 10000)],
      '2026-09-20T10:00:00Z',
    );

    const result = await getWeeklyTotals(deps, { weeks: 3 });

    expect(result.today).toBe('2026-09-20');
    expect(result.weeks.map((w) => [w.weekStart, w.weekEnd])).toEqual([
      ['2026-08-31', '2026-09-06'],
      ['2026-09-07', '2026-09-13'],
      ['2026-09-14', '2026-09-20'],
    ]);
    expect(result.weeks[0]).toMatchObject({ sessions: 0, distanceKm: 0 });
    expect(result.weeks[2]).toMatchObject({ sessions: 1, distanceKm: 10 });
  });

  it('sums distance exactly per week, without float drift', async () => {
    const { deps } = build(
      [
        run('2026-09-20T07:00:00', 23010),
        run('2026-09-19T07:00:00', 11070),
        run('2026-09-18T07:00:00', 10010),
        run('2026-09-17T07:00:00', 12580),
        run('2026-09-16T07:00:00', 7010),
        run('2026-09-15T07:00:00', 11370),
        run('2026-09-13T07:00:00', 10030),
      ],
      '2026-09-20T10:00:00Z',
    );

    const result = await getWeeklyTotals(deps, { weeks: 2 });

    const current = result.weeks[1];
    expect(current.weekStart).toBe('2026-09-14');
    expect(current.distanceKm).toBe(75.05);
    expect(current.sessions).toBe(6);
    expect(result.weeks[0].distanceKm).toBe(10.03);
    expect(result.total.distanceKm).toBe(85.08);
    expect(result.total.sessions).toBe(7);
  });

  it('flags only the week that has not ended as partial', async () => {
    const { deps } = build([], '2026-09-16T10:00:00Z');

    const result = await getWeeklyTotals(deps, { weeks: 2 });

    expect(result.weeks.map((w) => w.partial)).toEqual([false, true]);
  });

  it('fetches from the first Monday to today and forwards the sport filter', async () => {
    const { deps, getActivities } = build([], '2026-09-20T10:00:00Z');

    await getWeeklyTotals(deps, { weeks: 3, sport: 'Run' });

    const [range, sport] = getActivities.mock.calls[0];
    expect(range.from.toISOString().slice(0, 10)).toBe('2026-08-31');
    expect(range.to.toISOString()).toBe('2026-09-20T10:00:00.000Z');
    expect(sport).toBe('Run');
  });

  it('defaults to 4 weeks', async () => {
    const { deps } = build([], '2026-09-20T10:00:00Z');

    const result = await getWeeklyTotals(deps, {});

    expect(result.weeks).toHaveLength(4);
  });
});

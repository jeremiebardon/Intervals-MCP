import { cn } from 'cn';

import type { Dashboard } from '../api';

type TrainingLoadChartProps = {
  weeks: Dashboard['trainingLoad']['weeks'];
  deltaLabel: string;
};

/**
 * Twelve-week training load — Figma 2:6217. Plain CSS bars rather than a
 * charting library: it is twelve values and a label row.
 *
 * The most recent week carries the achievement colour; the rest are a muted
 * brand. Every bar also has a text label, so the highlight is never the only
 * thing carrying meaning.
 */
export function TrainingLoadChart({
  weeks,
  deltaLabel,
}: TrainingLoadChartProps) {
  const peak = Math.max(...weeks.map(({ value }) => value), 0);

  return (
    <section className="flex flex-col gap-4 rounded-md border border-line bg-surface p-5">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-heading-sm font-bold text-ink">
            Training load
          </h2>
          <p className="text-body-sm text-ink-secondary">
            Last 12 weeks · Optimal range
          </p>
        </div>
        <span className="mono-label rounded-pill bg-achievement px-2.5 py-1 text-ink">
          {deltaLabel}
        </span>
      </header>

      {weeks.length === 0 ? (
        <p className="py-12 text-center text-body-sm text-ink-secondary">
          No training load yet — it appears once you log a few sessions.
        </p>
      ) : (
        <ol className="flex h-[180px] items-end gap-2">
          {weeks.map(({ week, value }, index) => (
            <li
              key={week}
              aria-label={`Week ${week}: ${value}`}
              className="flex h-full flex-1 flex-col justify-end gap-2"
            >
              <span
                className={cn(
                  'w-full rounded-xs',
                  index === weeks.length - 1 ? 'bg-achievement' : 'bg-brand/60',
                )}
                style={{ height: `${peak === 0 ? 0 : (value / peak) * 100}%` }}
              />
            </li>
          ))}
        </ol>
      )}

      {weeks.length > 0 && (
        <div className="flex gap-2" aria-hidden>
          {weeks.map(({ week }) => (
            <span
              key={week}
              className="mono-label flex-1 text-center text-ink-tertiary"
            >
              {week}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

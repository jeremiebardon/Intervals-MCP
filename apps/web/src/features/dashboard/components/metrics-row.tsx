import { cn } from 'cn';
import { Flame, Gauge, HeartPulse, Route } from 'lucide-react';

import type { Dashboard } from '../api';

const ICONS = {
  route: Route,
  gauge: Gauge,
  heart: HeartPulse,
  flame: Flame,
} as const;

const ICON_TONE = {
  route: 'bg-brand-subtle text-brand',
  gauge: 'bg-route-subtle text-route-strong',
  heart: 'bg-danger-subtle text-heart',
  flame: 'bg-brand-subtle text-brand',
} as const;

const DELTA_TONE = {
  up: 'text-achievement-strong',
  down: 'text-route-strong',
  steady: 'text-heart',
} as const;

/** Four metric cards — Figma 2:6175. */
export function MetricsRow({ metrics }: { metrics: Dashboard['metrics'] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ id, label, value, unit, delta, tone, icon }) => {
        const Icon = ICONS[icon];

        return (
          <article
            key={id}
            className="flex min-h-[130px] flex-col justify-between rounded-md border border-line bg-surface p-4"
          >
            <div className="flex items-start justify-between">
              <p className="mono-label text-ink-secondary">{label}</p>
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-xs',
                  ICON_TONE[icon],
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <p className="flex items-baseline gap-1">
                <span className="font-mono text-metric font-medium text-ink">
                  {value}
                </span>
                <span className="text-body-sm text-ink-secondary">{unit}</span>
              </p>
              <span
                className={cn('mono-label', DELTA_TONE[tone])}
                title={`Change: ${delta}`}
              >
                {delta}
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

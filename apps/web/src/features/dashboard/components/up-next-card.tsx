import { cn } from 'cn';
import { Gauge, Route, Waves } from 'lucide-react';

import type { Dashboard } from '../api';

const ICONS = { gauge: Gauge, waves: Waves, route: Route } as const;

const TAG_TONE = {
  KEY: 'text-brand',
  EASY: 'bg-route-subtle text-route-strong',
  LONG: 'bg-achievement text-ink',
} as const;

const ICON_TONE = {
  gauge: 'bg-brand-subtle text-brand',
  waves: 'bg-route-subtle text-route-strong',
  route: 'bg-achievement text-ink',
} as const;

/** Upcoming sessions — Figma 2:6261. */
export function UpNextCard({ upNext }: { upNext: Dashboard['upNext'] }) {
  return (
    <section className="flex flex-col rounded-md border border-line bg-surface">
      <header className="flex items-start justify-between p-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-heading-sm font-bold text-ink">
            Up next
          </h2>
          <p className="text-body-sm text-ink-secondary">
            Week 8 · Build phase
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Not part of this release"
          className="cursor-not-allowed text-label-md font-bold text-brand"
        >
          View plan
        </button>
      </header>

      <ul className="flex flex-col">
        {upNext.map(({ id, day, title, detail, tag, icon }, index) => {
          const Icon = ICONS[icon];
          const isToday = index === 0;

          return (
            <li
              key={id}
              className={cn(
                'flex items-center gap-4 border-t border-line px-5 py-3.5',
                isToday && 'bg-brand-subtle',
              )}
            >
              <span
                className={cn(
                  'mono-label w-14 shrink-0',
                  isToday ? 'text-brand' : 'text-ink-secondary',
                )}
              >
                {day}
              </span>

              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-xs',
                  ICON_TONE[icon],
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>

              <span className="flex flex-1 flex-col">
                <span className="text-label-md font-bold text-ink">
                  {title}
                </span>
                <span className="font-mono text-body-sm text-ink-secondary">
                  {detail}
                </span>
              </span>

              <span
                className={cn(
                  'mono-label shrink-0 rounded-pill px-2.5 py-1',
                  TAG_TONE[tag],
                )}
              >
                {tag}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

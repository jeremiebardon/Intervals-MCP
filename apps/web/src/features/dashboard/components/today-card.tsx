import { Play } from 'lucide-react';

import type { Dashboard } from '../api';

/**
 * The hero session card — Figma 2:6154. Brand fill, two decorative orbit
 * rings bleeding off the right edge, session summary left, stats and the
 * primary action right.
 */
export function TodayCard({ today }: { today: Dashboard['today'] }) {
  return (
    <section className="relative flex min-h-[154px] items-center justify-between overflow-hidden rounded-md bg-brand px-6 py-8">
      {/* Decorative orbits (2:6155, 2:6156). */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[53px] right-[-66px] size-[260px] rounded-pill border border-white/20"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[8px] right-[-16px] size-[170px] rounded-pill border border-white/20"
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="mono-label rounded-pill bg-achievement px-3 py-1.5 text-ink">
            {today.badge}
          </span>
          <span className="text-body-sm text-on-brand/80">{today.weather}</span>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="font-display text-heading-lg font-bold text-on-brand">
            {today.title}
          </h2>
          <p className="text-body-sm text-on-brand/80">{today.detail}</p>
        </div>
      </div>

      <div className="relative flex items-center gap-8">
        <Stat value={today.distanceKm.toFixed(1)} label="Kilometers" />
        <Stat value={today.targetPace} label="Target pace" />

        <button
          type="button"
          className="flex h-[46px] items-center gap-2 rounded-sm bg-achievement px-5 text-label-md font-bold text-ink transition-colors duration-[120ms] hover:bg-achievement/90"
        >
          <Play className="size-4" strokeWidth={1.75} aria-hidden />
          Start run
        </button>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[26px] leading-8 font-medium text-on-brand">
        {value}
      </span>
      <span className="mono-label text-on-brand/70">{label}</span>
    </div>
  );
}

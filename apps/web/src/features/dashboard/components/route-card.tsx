import { ArrowUpRight, Route } from 'lucide-react';

import type { Dashboard } from '../api';

/**
 * Recommended route — Figma 2:6296.
 *
 * The map is not an image: the three "streets" are rotated 2px rules and the
 * course glyph is Lucide's `route`, which is what the design uses.
 */
export function RouteCard({ route }: { route: Dashboard['route'] }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-[0_8px_24px_0_rgb(21_21_29_/_0.07)]">
      <div className="relative h-[137px] overflow-hidden bg-[#e8f7f8] p-[18px] dark:bg-surface">
        <span
          aria-hidden
          className="absolute top-[31px] -left-[10px] h-0.5 w-[460px] rotate-8 bg-[#c8dfe2] dark:bg-line"
        />
        <span
          aria-hidden
          className="absolute top-[10px] left-10 h-0.5 w-[410px] -rotate-11 bg-[#c8dfe2] dark:bg-line"
        />
        <span
          aria-hidden
          className="absolute top-[-20px] left-[248px] h-0.5 w-[230px] rotate-76 bg-[#c8dfe2] dark:bg-line"
        />

        <Route
          className="relative size-[70px] text-route"
          strokeWidth={1.75}
          aria-hidden
        />

        {/* Inter Bold 11px, sentence case — not the mono eyebrow (2:6304). */}
        <span className="absolute top-3.5 right-4 rounded-pill bg-route-subtle px-2.5 py-[5px] text-caption font-bold text-route-strong">
          {route.badge}
        </span>
      </div>

      <div className="flex flex-1 items-center justify-between px-[18px] py-4">
        <div className="flex flex-col gap-1">
          <p className="text-label-md font-bold text-ink">{route.name}</p>
          <p className="font-mono text-caption text-ink-secondary">
            {route.detail}
          </p>
        </div>

        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-sm border border-line bg-canvas text-ink transition-colors duration-[120ms] hover:bg-surface"
        >
          <ArrowUpRight
            className="size-[17px]"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="sr-only">Open {route.name}</span>
        </button>
      </div>
    </section>
  );
}

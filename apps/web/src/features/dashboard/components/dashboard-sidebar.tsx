'use client';

import { cn } from 'cn';
import Link from 'next/link';
import {
  CalendarDays,
  LayoutDashboard,
  MessageSquareHeart,
  Route,
  Settings,
  Zap,
} from 'lucide-react';

import type { Dashboard } from '../api';

const NAV_ITEM_CLASS =
  'flex h-[42px] w-full items-center gap-3 rounded-sm px-3 text-left text-label-md font-bold transition-colors duration-[120ms]';

const NAV = [
  { label: 'Dashboard', Icon: LayoutDashboard, active: true },
  { label: 'Plans', Icon: CalendarDays, active: false },
  { label: 'Training', Icon: Route, active: false },
  { label: 'Coach', Icon: MessageSquareHeart, active: false },
];

type SidebarProps = {
  plan: Dashboard['plan'];
  athlete: { name: string; initials: string; plan: string };
};

/**
 * Dashboard sidebar — Figma 2:6096. 238px fixed, brand area, primary nav,
 * plan card, settings and athlete profile. Hidden below lg; the designs
 * only cover the 1440 dashboard.
 */
export function DashboardSidebar({ plan, athlete }: SidebarProps) {
  return (
    <aside className="hidden w-[238px] shrink-0 flex-col border-r border-line bg-surface px-[18px] py-6 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <span className="flex size-8 items-center justify-center rounded-sm bg-brand">
          <Zap
            className="size-4 text-on-brand"
            strokeWidth={1.75}
            aria-hidden
          />
        </span>
        <span className="font-display text-heading-sm font-bold text-ink">
          StrideVolt
        </span>
      </div>

      {/* Only Dashboard is designed, so it is the sole real link; the rest
          are inert controls rather than href="#" anchors, which are not
          reachable or announced correctly. */}
      <nav className="mt-8 flex flex-col gap-[5px]" aria-label="Main">
        {NAV.map(({ label, Icon, active }) =>
          active ? (
            <Link
              key={label}
              href="/dashboard"
              aria-current="page"
              className={NAV_ITEM_CLASS + ' bg-brand-subtle text-brand'}
            >
              <Icon className="size-[17px]" strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          ) : (
            <button
              key={label}
              type="button"
              disabled
              title="Not part of this release"
              className={cn(
                NAV_ITEM_CLASS,
                'cursor-not-allowed text-ink-secondary',
              )}
            >
              <Icon className="size-[17px]" strokeWidth={1.75} aria-hidden />
              {label}
            </button>
          ),
        )}
      </nav>

      {/* Plan card — inverted in light, a raised card in dark (Figma 2:6118),
          so only the background switches. */}
      <div className="mt-8 flex flex-col gap-4 rounded-sm bg-[#15151d] p-4 dark:bg-raised">
        <span className="flex size-8 items-center justify-center rounded-xs bg-achievement">
          <Zap
            className="size-4 text-[#15151d]"
            strokeWidth={1.75}
            aria-hidden
          />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-label-md font-bold text-white">{plan.title}</p>
          <p className="text-caption text-[#9a9ca8]">{plan.detail}</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-pill bg-white/15">
          <span
            className="block h-full rounded-pill bg-achievement"
            style={{ width: `${plan.progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        disabled
        title="Not part of this release"
        className="mt-8 flex h-[38px] w-full cursor-not-allowed items-center gap-3 rounded-sm px-3 text-left text-label-md font-bold text-ink-secondary"
      >
        <Settings className="size-4" strokeWidth={1.75} aria-hidden />
        Settings
      </button>

      <div className="mt-auto flex items-center gap-3 border-t border-line pt-4">
        <span className="flex size-9 items-center justify-center rounded-pill bg-brand-subtle text-caption font-bold text-brand">
          {athlete.initials}
        </span>
        <span className="flex flex-col">
          <span className="text-label-md font-bold text-ink">
            {athlete.name}
          </span>
          <span className="text-caption text-ink-secondary">
            {athlete.plan}
          </span>
        </span>
      </div>
    </aside>
  );
}

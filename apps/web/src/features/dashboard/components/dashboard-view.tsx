'use client';

import { Bell, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ThemeToggle } from '@/shared/design-system/theme-toggle';
import { Button } from '@/shared/ui/button';

import { getDashboard, type Dashboard } from '../api';
import { DashboardSidebar } from './dashboard-sidebar';
import { MetricsRow } from './metrics-row';
import { RecoveryCard } from './recovery-card';
import { RouteCard } from './route-card';
import { TodayCard } from './today-card';
import { TrainingLoadChart } from './training-load-chart';
import { UpNextCard } from './up-next-card';

const ATHLETE = {
  name: 'Alex Morgan',
  initials: 'AM',
  plan: 'Performance plan',
};

export function DashboardView() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    void getDashboard().then(setData);
  }, []);

  if (!data) {
    return (
      <output className="flex min-h-screen items-center justify-center bg-canvas text-body-md text-ink-secondary">
        Loading your week…
      </output>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <DashboardSidebar plan={data.plan} athlete={ATHLETE} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between px-6 lg:px-[30px]">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-heading-lg font-bold text-ink">
              {data.greeting}
            </h1>
            <p className="text-caption text-ink-secondary">{data.date}</p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" size="icon" className="size-10">
              <Search className="size-4" strokeWidth={1.75} aria-hidden />
              <span className="sr-only">Search</span>
            </Button>
            <Button variant="secondary" size="icon" className="size-10">
              <Bell className="size-4" strokeWidth={1.75} aria-hidden />
              <span className="sr-only">Notifications</span>
            </Button>
          </div>
        </header>

        <main className="flex flex-col gap-[18px] px-6 pb-8 lg:px-[30px]">
          <TodayCard today={data.today} />
          <MetricsRow metrics={data.metrics} />

          <div className="grid gap-[18px] xl:grid-cols-[582fr_542fr]">
            <TrainingLoadChart
              weeks={data.trainingLoad.weeks}
              deltaLabel={data.trainingLoad.deltaLabel}
            />
            <UpNextCard upNext={data.upNext} />
          </div>

          <div className="grid gap-[18px] xl:grid-cols-[543fr_581fr]">
            <RouteCard route={data.route} />
            <RecoveryCard recovery={data.recovery} />
          </div>
        </main>
      </div>
    </div>
  );
}

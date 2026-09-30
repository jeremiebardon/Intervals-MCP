'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { Onboarding } from '@/mocks/db';
import { Button } from '@/shared/ui/button';

import { getOnboarding } from '../api';

const SPORT_LABELS: Record<string, string> = {
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
};

function summarise(onboarding: Onboarding | null) {
  if (!onboarding) return [];

  const slots = onboarding.availability.length;
  const days = new Set(
    onboarding.availability.map((slot) => slot.split(':')[0]),
  ).size;

  return [
    {
      label: 'Availability',
      value: `${slots} ${slots === 1 ? 'slot' : 'slots'} · ${days} ${days === 1 ? 'day' : 'days'}`,
    },
    {
      label: 'Sport',
      value:
        onboarding.sports.map((sport) => SPORT_LABELS[sport]).join(', ') ||
        'None',
    },
    {
      label: 'Intervals.icu',
      value: onboarding.intervalsConnected ? 'Connected' : 'Not connected',
    },
  ];
}

export function DoneStep() {
  const router = useRouter();
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);

  useEffect(() => {
    void getOnboarding().then(setOnboarding);
  }, []);

  return (
    <div className="flex w-full flex-1 flex-col gap-6 md:flex-none">
      <div className="flex flex-1 flex-col justify-center gap-6 md:flex-none">
        <span className="flex size-16 items-center justify-center rounded-md bg-achievement">
          <Check className="size-8 text-ink" strokeWidth={1.75} aria-hidden />
        </span>

        <div className="flex flex-col gap-3">
          <p className="mono-label text-brand">All set</p>
          <h1 className="font-display text-display-lg font-bold text-ink">
            You&rsquo;re ready to run.
          </h1>
          <p className="text-body-lg text-ink-secondary">
            Your plan will be built from what you just shared.
          </p>
        </div>

        <dl className="flex flex-col gap-4 rounded-sm border border-line bg-surface p-4">
          {summarise(onboarding).map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <dt className="mono-label text-ink-secondary">{label}</dt>
              <dd className="text-label-md font-bold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <footer className="pt-2">
        <Button
          type="button"
          className="w-full"
          onClick={() => router.push('/dashboard')}
        >
          Start training
        </Button>
      </footer>
    </div>
  );
}

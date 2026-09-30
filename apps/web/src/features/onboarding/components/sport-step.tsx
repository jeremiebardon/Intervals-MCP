'use client';

import { cn } from 'cn';
import { Bike, Check, Footprints, Waves } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { SportId } from '@/mocks/db';
import { Button } from '@/shared/ui/button';

import { getOnboarding, saveOnboarding } from '../api';
import { OnboardingShell } from './onboarding-shell';

const SPORTS = [
  { id: 'running', label: 'Running', detail: 'Road & track', Icon: Footprints },
  { id: 'cycling', label: 'Cycling', detail: 'Road & gravel', Icon: Bike },
  {
    id: 'swimming',
    label: 'Swimming',
    detail: 'Pool & open water',
    Icon: Waves,
  },
] as const satisfies ReadonlyArray<{
  id: SportId;
  label: string;
  detail: string;
  Icon: typeof Bike;
}>;

export function SportStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<SportId[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getOnboarding().then(({ sports }) => setSelected(sports));
  }, []);

  function toggle(id: SportId) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((sport) => sport !== id)
        : [...current, id],
    );
  }

  async function handleContinue() {
    setSaving(true);
    await saveOnboarding({ sports: selected });
    router.push('/onboarding/intervals');
  }

  return (
    <OnboardingShell
      step={2}
      eyebrow="Required · Sports"
      title="Choose your sports"
      description="Select the sports you want to focus on."
      cta={
        <Button
          type="button"
          className="w-full"
          disabled={selected.length === 0 || saving}
          onClick={() => void handleContinue()}
        >
          Continue
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {SPORTS.map(({ id, label, detail, Icon }) => {
          const isSelected = selected.includes(id);

          return (
            <button
              key={id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => toggle(id)}
              className={cn(
                'flex items-center gap-4 rounded-sm border bg-surface p-4 text-left',
                'transition-colors duration-[120ms] ease-standard',
                'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                isSelected
                  ? 'border-brand'
                  : 'border-line hover:border-line-strong',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-xs border',
                  isSelected
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-line-strong bg-surface',
                )}
              >
                {isSelected && <Check className="size-3.5" strokeWidth={2.5} />}
              </span>

              <Icon
                className="size-6 shrink-0 text-ink-secondary"
                strokeWidth={1.75}
                aria-hidden
              />

              <span className="flex flex-col">
                <span className="text-label-md font-bold text-ink">
                  {label}
                </span>
                <span className="text-body-sm text-ink-secondary">
                  {detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

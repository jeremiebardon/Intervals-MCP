'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { SlotId } from '@/mocks/db';
import { Button } from '@/shared/ui/button';

import { getOnboarding, saveOnboarding } from '../api';
import { AvailabilityGrid } from './availability-grid';
import { OnboardingShell } from './onboarding-shell';

export function AvailabilityStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<SlotId[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getOnboarding().then(({ availability }) => setSelected(availability));
  }, []);

  const dayCount = new Set(selected.map((slot) => slot.split(':')[0])).size;

  async function handleContinue() {
    setSaving(true);
    await saveOnboarding({ availability: selected });
    router.push('/onboarding/sport');
  }

  return (
    <OnboardingShell
      step={1}
      eyebrow="Required · Availability"
      title="When can you train?"
      description="Pick the slots you can commit to each week. We'll build your plan around them."
      hint={
        selected.length === 0
          ? 'No slots selected · at least 1 needed'
          : `${selected.length} ${selected.length === 1 ? 'slot' : 'slots'} selected · ${dayCount} ${dayCount === 1 ? 'day' : 'days'}`
      }
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
      <AvailabilityGrid selected={selected} onChange={setSelected} />
    </OnboardingShell>
  );
}

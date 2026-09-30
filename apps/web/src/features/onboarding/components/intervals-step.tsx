'use client';

import { Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormField } from '@/shared/design-system/form-field';
import { Button } from '@/shared/ui/button';

import { connectIntervals } from '../api';
import { OnboardingShell } from './onboarding-shell';

export function IntervalsStep() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConnect() {
    setError(null);
    setSubmitting(true);

    try {
      await connectIntervals(key);
      router.push('/onboarding/done');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Something went wrong. Please try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell
      step={3}
      eyebrow="Required · Integration"
      title="Connect Intervals.icu"
      description="Paste your API key so we can read your workouts and wellness data."
      hint={key.trim() ? undefined : 'Enter your API key to continue'}
      cta={
        <Button
          type="button"
          className="w-full"
          disabled={!key.trim() || submitting}
          onClick={() => void handleConnect()}
        >
          {submitting ? 'Connecting…' : 'Connect & finish'}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField
          label="Intervals.icu API key"
          name="intervalsKey"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="Paste your API key"
          helper="Stored securely. You can revoke it anytime in Intervals.icu."
          error={error ?? undefined}
        />

        <div className="flex gap-3 rounded-sm border-l-2 border-brand bg-surface p-4">
          <Info
            className="size-4 shrink-0 text-brand"
            strokeWidth={1.75}
            aria-hidden
          />
          <div className="flex flex-col gap-1">
            <p className="text-label-md font-bold text-ink">
              Where to find your key
            </p>
            <p className="text-body-sm text-ink-secondary">
              Intervals.icu → Settings → Developer Settings → API Key
            </p>
          </div>
        </div>
      </div>
    </OnboardingShell>
  );
}

'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { StepProgress } from '@/shared/design-system/step-progress';
import { Button } from '@/shared/ui/button';

type OnboardingShellProps = {
  step: number;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  /** Optional line above the CTA, e.g. "5 slots selected · at least 1 needed". */
  hint?: string;
  cta: ReactNode;
};

/**
 * Header (back + STEP n OF 3 + progress), body and footer shared by every
 * onboarding step — Figma 13:21 / 13:30 / 13:96.
 */
export function OnboardingShell({
  step,
  eyebrow,
  title,
  description,
  children,
  hint,
  cta,
}: OnboardingShellProps) {
  const router = useRouter();

  return (
    <div className="flex w-full flex-1 flex-col gap-6 md:flex-none">
      <header className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="-ml-3 size-6 p-0"
          >
            <ChevronLeft className="size-6" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">Go back</span>
          </Button>
          <p className="mono-label text-ink-secondary">Step {step} of 3</p>
        </div>
        <StepProgress step={step} />
      </header>

      <div className="flex flex-1 flex-col gap-6 md:flex-none">
        <div className="flex flex-col gap-3">
          <p className="mono-label text-brand">{eyebrow}</p>
          <h1 className="font-display text-display-lg font-bold text-ink">
            {title}
          </h1>
          <p className="text-body-lg text-ink-secondary">{description}</p>
        </div>

        {children}
      </div>

      <footer className="flex flex-col gap-3 pt-2">
        {hint && (
          <p className="text-center text-body-sm text-ink-secondary">{hint}</p>
        )}
        {cta}
      </footer>
    </div>
  );
}

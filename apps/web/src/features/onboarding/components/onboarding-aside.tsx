'use client';

import { cn } from 'cn';
import { usePathname } from 'next/navigation';

const STEPS = [
  { slug: 'availability', label: 'Availability' },
  { slug: 'sport', label: 'Sport' },
  { slug: 'intervals', label: 'Intervals.icu' },
];

/**
 * Desktop brand-panel message for the onboarding steps — Figma 17:333.
 * The current step is a filled brand dot with white text; the remaining
 * steps are outlined dots with muted text.
 */
export function OnboardingAside() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <p className="mono-label text-brand">Set up in 3 steps</p>
      <h2 className="font-display text-display font-bold text-ink">
        Built around your week.
      </h2>
      <ol className="flex flex-col gap-4">
        {STEPS.map(({ slug, label }) => {
          const isCurrent = pathname?.endsWith(`/${slug}`) ?? false;

          return (
            <li key={slug} className="flex items-center gap-4">
              <span
                aria-hidden
                className={cn(
                  'size-5 rounded-pill border-2',
                  isCurrent
                    ? 'border-brand bg-brand'
                    : 'border-ink-tertiary bg-transparent',
                )}
              />
              <span
                className={cn(
                  'text-body-lg',
                  isCurrent ? 'text-ink' : 'text-ink-secondary',
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

import { cn } from 'cn';

const TOTAL_STEPS = 3;

/**
 * Onboarding progress — Figma node 9:30.
 *
 * brand.primary marks reached segments, border.default the remaining ones.
 * Lime is deliberately not used here: at 1.18:1 on white it fails the 3:1
 * non-text contrast minimum.
 */
export function StepProgress({ step }: { step: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-label={`Step ${step} of ${TOTAL_STEPS}`}
      className="flex h-1 w-full items-start gap-2"
    >
      {Array.from({ length: TOTAL_STEPS }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-1 flex-1 rounded-pill',
            index < step ? 'bg-brand' : 'bg-line',
          )}
        />
      ))}
    </div>
  );
}

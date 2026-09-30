import { cn } from 'cn';
import { Zap } from 'lucide-react';

/**
 * Brand mark + wordmark — Figma node 11:94. The mark is Lucide's `zap` at the
 * 1.75px stroke the Foundations frame specifies for all iconography.
 *
 * The wordmark uses `text-ink`, so it inverts automatically inside any
 * `dark`-scoped container (the desktop auth brand panel) as well as in dark
 * mode.
 */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="flex size-9 items-center justify-center rounded-sm bg-brand">
        <Zap className="size-5 text-on-brand" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="font-display text-heading-sm font-bold text-ink">
        StrideVolt
      </span>
    </div>
  );
}

import { cn } from 'cn';
import * as React from 'react';

/**
 * StrideVolt text field — Figma node 10:22.
 * Default / Focus / Error / Disabled, 48px tall. The error state pairs a
 * danger outline with helper text that explains the recovery path.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-12 w-full rounded-sm border border-line-strong bg-surface px-4 py-3',
        'text-body-md text-ink placeholder:text-ink-tertiary',
        'transition-colors duration-[120ms] ease-standard outline-none',
        'focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/30',
        'aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/30',
        'disabled:cursor-not-allowed disabled:border-line disabled:bg-disabled-bg disabled:text-disabled-fg',
        className,
      )}
      {...props}
    />
  );
}

export { Input };

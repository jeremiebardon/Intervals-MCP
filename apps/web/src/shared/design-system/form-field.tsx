import { cn } from 'cn';
import { useId } from 'react';
import type { ComponentProps } from 'react';

import { Input } from '@/shared/ui/input';

type FormFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  helper?: string;
  error?: string;
};

/**
 * Label + field + helper, stacked on an 8px gap — the pattern every auth and
 * onboarding screen uses (Figma 10:22). The label stays visible through
 * focus, validation and disabled states rather than collapsing into a
 * placeholder, and the error replaces the helper so only one message shows.
 */
export function FormField({
  label,
  helper,
  error,
  className,
  name,
  ...props
}: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? helper;

  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <label htmlFor={id} className="mono-label text-ink-secondary">
        {label}
      </label>

      <Input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...props}
      />

      {message && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn(
            'text-caption',
            error ? 'text-danger-text' : 'text-ink-secondary',
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';
import { Slot } from 'radix-ui';
import * as React from 'react';

/**
 * StrideVolt button — Figma node 9:17.
 * Primary / Secondary / Ghost / Danger x Default / Disabled.
 * 48px tall, above the 44px minimum touch target.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-sm text-label-md font-bold whitespace-nowrap transition-colors duration-[120ms] ease-standard outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-on-brand shadow-control hover:bg-brand-hover disabled:bg-disabled-bg disabled:text-disabled-fg disabled:shadow-none',
        secondary:
          'border border-line bg-surface text-ink hover:bg-canvas disabled:bg-disabled-bg disabled:text-disabled-fg',
        ghost:
          'text-ink hover:bg-canvas disabled:bg-transparent disabled:text-disabled-fg',
        danger:
          'bg-danger text-on-brand shadow-control hover:bg-danger/90 disabled:bg-disabled-bg disabled:text-disabled-fg',
      },
      size: {
        default: 'h-12 px-6 py-2',
        icon: 'size-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'primary',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

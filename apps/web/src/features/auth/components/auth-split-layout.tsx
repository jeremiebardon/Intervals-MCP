import type { ReactNode } from 'react';

import { BrandLockup } from '@/shared/design-system/brand-lockup';

type AuthSplitLayoutProps = {
  children: ReactNode;
  /** Brand-panel message; desktop only (Figma 17:292 / 17:333). */
  aside: ReactNode;
};

/**
 * The shell shared by login and every onboarding step.
 *
 * Three designed breakpoints, one component:
 *   mobile  (390, 12:5)   full-bleed canvas, brand lockup above the content
 *   tablet  (834, 16:152) a centred 560px card on the canvas
 *   desktop (1440, 17:285) dark brand panel (560px) beside a form panel
 */
export function AuthSplitLayout({ children, aside }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas lg:flex">
      {/* Desktop-only brand panel. It is dark in both themes, so it carries
          the `dark` class and reads the dark token values rather than
          hardcoding colours. */}
      <aside className="dark hidden w-[560px] shrink-0 flex-col justify-between bg-canvas px-12 py-12 lg:flex">
        <BrandLockup />
        <div className="pb-24">{aside}</div>
        <p className="text-body-sm text-ink-tertiary">
          Required setup · about 2 minutes
        </p>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col px-6 pt-12 pb-8 md:min-h-0 md:items-center md:justify-center md:px-0 md:py-16 lg:px-0">
        {/* Mobile keeps the lockup inline above the content. */}
        <div className="mb-6 md:hidden">
          <BrandLockup />
        </div>

        <div className="flex w-full flex-1 flex-col md:w-[560px] md:flex-none md:rounded-md md:bg-surface md:p-12 md:shadow-elevation-1 lg:w-[440px] lg:bg-transparent lg:p-0 lg:shadow-none">
          {/* Tablet card carries its own lockup. */}
          <div className="mb-6 hidden md:block lg:hidden">
            <BrandLockup />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

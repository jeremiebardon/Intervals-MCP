'use client';

import { type ReactNode, useEffect, useState } from 'react';

const mockingEnabled = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

/**
 * Memoised so the worker starts exactly once. React double-invokes effects in
 * development, and a second worker.start() throws "cannot configure an
 * already enabled network".
 */
let startPromise: Promise<unknown> | null = null;

function startWorker(): Promise<unknown> {
  startPromise ??= import('./browser').then(({ worker }) =>
    worker.start({
      // Next streams RSC payloads, HMR and /_next/* assets through fetch;
      // anything stricter than bypass floods or breaks the dev server.
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: '/mockServiceWorker.js' },
    }),
  );

  return startPromise;
}

/**
 * Starts the MSW service worker before rendering anything that might fetch.
 *
 * This deliberately is not `instrumentation-client.ts`: Next does not await
 * async work started there before hydration, while MSW requires awaiting
 * `worker.start()` to avoid a registration race.
 */
export function MswProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!mockingEnabled);

  useEffect(() => {
    if (!mockingEnabled) return;

    let cancelled = false;
    const done = () => {
      if (!cancelled) setReady(true);
    };

    startWorker().then(done, (cause: unknown) => {
      // Fail open: a broken mock layer should surface as failed requests,
      // not as a permanently blank page.
      console.error('[msw] worker failed to start', cause);
      done();
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}

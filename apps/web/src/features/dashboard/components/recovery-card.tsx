import { CircleCheck } from 'lucide-react';

import type { Dashboard } from '../api';

/**
 * Recovery panel — Figma 2:6311 (light) and 2:6311's dark twin.
 *
 * It is inverted in light mode (near-black on a pale canvas) but becomes an
 * ordinary raised card in dark mode, so the background switches while the
 * foreground colours stay constant across both themes.
 */
export function RecoveryCard({
  recovery,
}: {
  recovery: Dashboard['recovery'];
}) {
  return (
    <section className="flex flex-col justify-between rounded-md bg-[#0d0e14] p-5 dark:border dark:border-line dark:bg-surface">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-heading-sm font-bold text-white">
            Recovery
          </h2>
          <p className="text-body-sm text-[#9a9ca8]">{recovery.headline}</p>
        </div>
        <span className="flex size-14 items-center justify-center rounded-pill bg-achievement font-mono text-heading-sm font-bold text-[#15151d]">
          {recovery.score}
        </span>
      </header>

      <dl className="mt-8 grid grid-cols-3 gap-4">
        <Signal label="Sleep" value={recovery.sleep} />
        <Signal label="HRV" value={recovery.hrv} unit="MS" tone="route" />
        <Signal label="RHR" value={recovery.rhr} unit="BPM" tone="heart" />
      </dl>

      <p className="mt-6 flex items-center gap-2 text-body-sm text-[#9a9ca8]">
        <CircleCheck
          className="size-4 text-achievement"
          strokeWidth={1.75}
          aria-hidden
        />
        {recovery.note}
      </p>
    </section>
  );
}

function Signal({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'route' | 'heart';
}) {
  const valueClass =
    tone === 'route'
      ? 'text-route'
      : tone === 'heart'
        ? 'text-heart'
        : 'text-white';

  return (
    <div className="flex flex-col gap-1">
      <dt className="mono-label text-[#9a9ca8]">{label}</dt>
      <dd className="flex items-baseline gap-1">
        <span className={`font-mono text-metric font-medium ${valueClass}`}>
          {value}
        </span>
        {unit && <span className="text-body-sm text-[#9a9ca8]">{unit}</span>}
      </dd>
    </div>
  );
}

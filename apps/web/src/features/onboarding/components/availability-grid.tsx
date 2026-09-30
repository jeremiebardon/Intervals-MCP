'use client';

import { cn } from 'cn';

import { TIME_SLOTS, WEEKDAYS, type SlotId } from '@/mocks/db';

type AvailabilityGridProps = {
  selected: string[];
  onChange: (next: SlotId[]) => void;
};

/**
 * Seven weekdays x three time slots — Figma 13:35, built from the
 * Availability row (10:28) and Slot chip (10:27) components. Each chip is a
 * 44px toggle target.
 */
export function AvailabilityGrid({
  selected,
  onChange,
}: AvailabilityGridProps) {
  function toggle(slot: SlotId) {
    onChange(
      selected.includes(slot)
        ? (selected.filter((current) => current !== slot) as SlotId[])
        : ([...selected, slot] as SlotId[]),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {WEEKDAYS.map((day) => (
        <div
          key={day}
          role="group"
          aria-label={day}
          className="flex items-center gap-2"
        >
          <span className="w-10 shrink-0 text-label-md font-bold text-ink">
            {day}
          </span>

          {TIME_SLOTS.map((time) => {
            const slot: SlotId = `${day}:${time}`;
            const isSelected = selected.includes(slot);

            return (
              <button
                key={time}
                type="button"
                // An explicit label rather than sr-only text: "Evening"
                // alone is ambiguous across seven rows, and Maestro reads
                // the accessibility tree rather than hidden spans.
                aria-label={`${day} ${time}`}
                aria-pressed={isSelected}
                onClick={() => toggle(slot)}
                className={cn(
                  'flex h-11 flex-1 items-center justify-center rounded-sm border p-2',
                  'text-label-sm font-medium transition-colors duration-[120ms] ease-standard',
                  'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  isSelected
                    ? 'border-brand bg-brand text-on-brand'
                    : 'border-line bg-surface text-ink-secondary hover:border-line-strong',
                )}
              >
                {time}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

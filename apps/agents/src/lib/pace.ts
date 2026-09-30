const TARGET_TIME = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/;

export interface RequiredPace {
  paceSecondsPerKm: number;
  /** Pace formatted as "m:ss" per kilometre, e.g. "4:02". */
  pacePerKm: string;
  speedKmh: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Parses "H:MM:SS" or "MM:SS" into seconds. */
export function parseTargetTime(text: string): number {
  const match = TARGET_TIME.exec(text);
  if (!match) {
    throw new Error(`Invalid target time "${text}": expected H:MM:SS or MM:SS`);
  }
  const [, first, second, third] = match;
  const seconds =
    third === undefined
      ? Number(first) * 60 + Number(second)
      : Number(first) * 3600 + Number(second) * 60 + Number(third);
  if (seconds <= 0) {
    throw new Error(`Invalid target time "${text}": must be greater than zero`);
  }
  return seconds;
}

export function requiredPace(
  distanceKm: number,
  targetSeconds: number,
): RequiredPace {
  if (!(distanceKm > 0)) {
    throw new Error(`distanceKm must be greater than zero (got ${distanceKm})`);
  }
  if (!(targetSeconds > 0)) {
    throw new Error(
      `targetSeconds must be greater than zero (got ${targetSeconds})`,
    );
  }
  const paceSecondsPerKm = targetSeconds / distanceKm;
  const rounded = Math.round(paceSecondsPerKm);
  const minutes = Math.floor(rounded / 60);
  const seconds = String(rounded % 60).padStart(2, '0');
  return {
    paceSecondsPerKm: round2(paceSecondsPerKm),
    pacePerKm: `${minutes}:${seconds}`,
    speedKmh: round2(distanceKm / (targetSeconds / 3600)),
  };
}

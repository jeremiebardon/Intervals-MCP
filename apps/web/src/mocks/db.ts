/**
 * The single source of mock state, shared by the Jest node server and the
 * browser service worker.
 *
 * `db` is a top-level const mutated field by field and never reassigned, so
 * every importer keeps a live view under both real ESM and the CJS interop
 * Jest uses.
 */

export type Athlete = {
  id: string;
  email: string;
  name: string;
  initials: string;
  plan: string;
};

export type Session = {
  token: string;
  athleteId: string;
};

export const WEEKDAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
] as const;
export const TIME_SLOTS = ['Morning', 'Noon', 'Evening'] as const;

export type Weekday = (typeof WEEKDAYS)[number];
export type TimeSlot = (typeof TIME_SLOTS)[number];
/** e.g. "Mon:Evening" */
export type SlotId = `${Weekday}:${TimeSlot}`;

export type SportId = 'running' | 'cycling' | 'swimming';

export type Onboarding = {
  availability: SlotId[];
  sports: SportId[];
  intervalsConnected: boolean;
};

type Db = {
  athletes: Athlete[];
  session: Session | null;
  onboarding: Onboarding;
};

/** The only key the mocked Intervals.icu integration accepts. */
export const VALID_INTERVALS_KEY = 'k9x2000000000000f3a';

const seedAthletes = (): Athlete[] => [
  {
    id: 'ath_1',
    email: 'alex@stridevolt.test',
    name: 'Alex Morgan',
    initials: 'AM',
    plan: 'Performance plan',
  },
];

const seedOnboarding = (): Onboarding => ({
  availability: [],
  sports: [],
  intervalsConnected: false,
});

export const db: Db = {
  athletes: seedAthletes(),
  session: null,
  onboarding: seedOnboarding(),
};

export function resetDb(): void {
  db.athletes = seedAthletes();
  db.session = null;
  db.onboarding = seedOnboarding();
}

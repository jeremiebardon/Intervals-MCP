import { HttpResponse, delay, http } from 'msw';

import { VALID_INTERVALS_KEY, db, type Onboarding } from './db';
import { dashboardFixture } from './fixtures/dashboard';

/**
 * Paths are relative on purpose: the service worker resolves them against the
 * page origin, and Jest resolves them against the url pinned in
 * jest.config.mjs. An absolute URL here would break the browser target as soon
 * as the dev server moved off port 3000.
 */
export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };

    const athlete = db.athletes.find((candidate) => candidate.email === email);
    if (!athlete || password !== 'correct-horse') {
      return HttpResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 },
      );
    }

    db.session = { token: 'mock-session-token', athleteId: athlete.id };
    await delay(150);

    return HttpResponse.json({ token: db.session.token, athlete });
  }),

  http.get('/api/me', () => {
    if (!db.session) {
      return new HttpResponse(null, { status: 401 });
    }

    const athlete = db.athletes.find(({ id }) => id === db.session?.athleteId);
    return HttpResponse.json(athlete);
  }),

  http.post('/api/auth/logout', () => {
    db.session = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/onboarding', () => HttpResponse.json(db.onboarding)),

  http.patch('/api/onboarding', async ({ request }) => {
    const patch = (await request.json()) as Partial<Onboarding>;
    db.onboarding = { ...db.onboarding, ...patch };

    return HttpResponse.json(db.onboarding);
  }),

  http.post('/api/onboarding/intervals-key', async ({ request }) => {
    const { key } = (await request.json()) as { key: string };
    await delay(150);

    if (key.trim() !== VALID_INTERVALS_KEY) {
      return HttpResponse.json(
        {
          message:
            "We couldn't verify this key. Check that you copied all of it.",
        },
        { status: 422 },
      );
    }

    db.onboarding = { ...db.onboarding, intervalsConnected: true };
    return HttpResponse.json(db.onboarding);
  }),

  http.get('/api/dashboard', () => HttpResponse.json(dashboardFixture)),
];

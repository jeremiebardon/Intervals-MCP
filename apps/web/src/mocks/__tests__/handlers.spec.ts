import { db } from '../db';

async function login(email: string, password: string) {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

describe('auth handlers', () => {
  it('signs in a seeded athlete and opens a session', async () => {
    const response = await login('alex@stridevolt.test', 'correct-horse');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      token: 'mock-session-token',
      athlete: { name: 'Alex Morgan' },
    });
  });

  it.each([
    ['nobody@stridevolt.test', 'correct-horse'],
    ['alex@stridevolt.test', 'wrong-password'],
  ])(
    'rejects %p / %p with 401 and leaves no session',
    async (email, password) => {
      const response = await login(email, password);

      expect(response.status).toBe(401);
      expect(db.session).toBeNull();
    },
  );

  it('refuses /api/me until a session exists', async () => {
    await expect(fetch('/api/me')).resolves.toMatchObject({ status: 401 });

    await login('alex@stridevolt.test', 'correct-horse');

    await expect(fetch('/api/me')).resolves.toMatchObject({ status: 200 });
  });

  it('starts each test from a freshly seeded store', () => {
    expect(db.session).toBeNull();
    expect(db.athletes).toHaveLength(1);
  });
});

import '@testing-library/jest-dom';

import { resetDb } from '@/mocks/db';
import { server } from '@/mocks/server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// resetHandlers() only undoes per-test server.use() overrides. The store is
// module state MSW cannot see, so it has to be reset alongside — otherwise
// tests pass individually and fail in file order.
afterEach(() => {
  server.resetHandlers();
  resetDb();
});

afterAll(() => {
  server.close();
});

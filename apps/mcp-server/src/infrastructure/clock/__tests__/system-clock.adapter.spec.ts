import { SystemClockAdapter } from '../system-clock.adapter';

describe('SystemClockAdapter', () => {
  it('returns the current time', () => {
    const before = Date.now();
    const clock = new SystemClockAdapter();
    const now = clock.now().getTime();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});

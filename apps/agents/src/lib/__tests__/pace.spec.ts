import { parseTargetTime, requiredPace } from '../pace';

describe('parseTargetTime', () => {
  it('parses H:MM:SS', () => {
    expect(parseTargetTime('1:25:00')).toBe(5100);
  });

  it('parses MM:SS', () => {
    expect(parseTargetTime('19:30')).toBe(1170);
  });

  it.each(['', 'abc', '1:2', '1:75:00', '1:25:75', '0:00'])(
    'rejects %p',
    (input) => {
      expect(() => parseTargetTime(input)).toThrow();
    },
  );
});

describe('requiredPace', () => {
  it('computes the pace for a 1h25 half marathon (4:02/km, not 4:27)', () => {
    const pace = requiredPace(21.0975, 5100);

    expect(pace.pacePerKm).toBe('4:02');
    expect(pace.paceSecondsPerKm).toBeCloseTo(241.73, 2);
    expect(pace.speedKmh).toBeCloseTo(14.89, 2);
  });

  it('computes an exact round pace', () => {
    const pace = requiredPace(10, 2400);

    expect(pace.pacePerKm).toBe('4:00');
    expect(pace.speedKmh).toBe(15);
  });

  it('rounds seconds up into the next minute when needed', () => {
    expect(requiredPace(1, 299.6).pacePerKm).toBe('5:00');
  });

  it.each([0, -5])('rejects a distance of %p km', (km) => {
    expect(() => requiredPace(km, 1000)).toThrow();
  });

  it('rejects a non-positive time', () => {
    expect(() => requiredPace(10, 0)).toThrow();
  });
});

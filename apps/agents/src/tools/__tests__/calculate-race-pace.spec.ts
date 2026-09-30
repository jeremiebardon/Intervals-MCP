import { calculateRacePace } from '../calculate-race-pace';

describe('calculateRacePace', () => {
  it('returns the required pace and speed for a distance and target time', () => {
    const result = calculateRacePace({
      distanceKm: 21.0975,
      targetTime: '1:25:00',
    });

    expect(result).toEqual({
      distanceKm: 21.0975,
      targetTime: '1:25:00',
      targetTimeSeconds: 5100,
      paceSecondsPerKm: 241.73,
      pacePerKm: '4:02',
      speedKmh: 14.89,
    });
  });

  it('propagates an invalid target time', () => {
    expect(() =>
      calculateRacePace({ distanceKm: 10, targetTime: 'fast' }),
    ).toThrow();
  });
});

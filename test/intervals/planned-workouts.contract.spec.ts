import { readFileSync } from 'fs';
import { join } from 'path';
import { plannedWorkoutsResponseSchema } from '../../src/infrastructure/intervals/schemas';
import { toPlannedWorkout } from '../../src/infrastructure/intervals/mappers';

describe('intervals.icu planned workouts contract', () => {
  it('parses and maps the planned workouts fixture', () => {
    const raw = JSON.parse(
      readFileSync(join(__dirname, '../../fixtures/planned-workouts.json'), 'utf-8'),
    );
    const parsed = plannedWorkoutsResponseSchema.parse(raw);
    const workouts = parsed.map(toPlannedWorkout);
    expect(workouts).toHaveLength(1);
    expect(workouts[0]).toMatchObject({ id: 'e987', sport: 'Run', name: 'Tempo run' });
  });
});

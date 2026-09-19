export interface PlannedWorkout {
  id: string;
  date: string;
  name: string;
  sport: string;
  description: string | null;
  plannedDurationSeconds: number | null;
  plannedDistanceMeters: number | null;
}

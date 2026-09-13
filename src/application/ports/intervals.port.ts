import { DateRange } from '../../domain/date-range';
import { Activity, ActivityDetail, TrainingLoad } from '../../domain/activity';
import { Wellness } from '../../domain/wellness';
import { PlannedWorkout } from '../../domain/planned-workout';

export abstract class IntervalsPort {
  abstract getActivities(range: DateRange, sport?: string): Promise<Activity[]>;
  abstract getActivityDetail(activityId: string): Promise<ActivityDetail>;
  abstract getWellness(range: DateRange): Promise<Wellness[]>;
  abstract getPlannedWorkouts(range: DateRange): Promise<PlannedWorkout[]>;
  abstract getTrainingLoad(range: DateRange): Promise<TrainingLoad[]>;
}

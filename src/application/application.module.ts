import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';
import { GetActivityDetailUseCase } from './use-cases/get-activity-detail.use-case';
import { GetWellnessTrendUseCase } from './use-cases/get-wellness-trend.use-case';
import { GetPlannedWeekUseCase } from './use-cases/get-planned-week.use-case';

@Module({
  providers: [
    GetRecentActivitiesUseCase,
    GetActivityDetailUseCase,
    GetWellnessTrendUseCase,
    GetPlannedWeekUseCase,
  ],
  exports: [
    GetRecentActivitiesUseCase,
    GetActivityDetailUseCase,
    GetWellnessTrendUseCase,
    GetPlannedWeekUseCase,
  ],
})
export class ApplicationModule {}

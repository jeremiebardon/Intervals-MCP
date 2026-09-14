import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';
import { GetActivityDetailUseCase } from './use-cases/get-activity-detail.use-case';
import { GetWellnessTrendUseCase } from './use-cases/get-wellness-trend.use-case';
import { GetPlannedWeekUseCase } from './use-cases/get-planned-week.use-case';
import { GetTrainingLoadSummaryUseCase } from './use-cases/get-training-load-summary.use-case';
import { ComparePeriodsUseCase } from './use-cases/compare-periods.use-case';

const useCases = [
  GetRecentActivitiesUseCase,
  GetActivityDetailUseCase,
  GetWellnessTrendUseCase,
  GetPlannedWeekUseCase,
  GetTrainingLoadSummaryUseCase,
  ComparePeriodsUseCase,
];

@Module({
  providers: useCases,
  exports: useCases,
})
export class ApplicationModule {}

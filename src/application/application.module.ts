import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';
import { GetActivityDetailUseCase } from './use-cases/get-activity-detail.use-case';
import { GetWellnessTrendUseCase } from './use-cases/get-wellness-trend.use-case';

@Module({
  providers: [GetRecentActivitiesUseCase, GetActivityDetailUseCase, GetWellnessTrendUseCase],
  exports: [GetRecentActivitiesUseCase, GetActivityDetailUseCase, GetWellnessTrendUseCase],
})
export class ApplicationModule {}

import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';
import { GetActivityDetailUseCase } from './use-cases/get-activity-detail.use-case';

@Module({
  providers: [GetRecentActivitiesUseCase, GetActivityDetailUseCase],
  exports: [GetRecentActivitiesUseCase, GetActivityDetailUseCase],
})
export class ApplicationModule {}

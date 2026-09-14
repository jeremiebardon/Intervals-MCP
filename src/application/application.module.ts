import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';

@Module({
  providers: [GetRecentActivitiesUseCase],
  exports: [GetRecentActivitiesUseCase],
})
export class ApplicationModule {}

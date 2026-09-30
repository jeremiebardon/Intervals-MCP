import { Module } from '@nestjs/common';
import { ClockModule } from '../infrastructure/clock/clock.module';
import { IntervalsModule } from '../infrastructure/intervals/intervals.module';
import { TrainingToolsService } from './training-tools.service';

@Module({
  imports: [IntervalsModule, ClockModule],
  providers: [TrainingToolsService],
  exports: [TrainingToolsService],
})
export class ToolsModule {}

import { Module } from '@nestjs/common';
import { ClockModule } from '../../infrastructure/clock/clock.module';
import { LlmModule } from '../../infrastructure/llm/llm.module';
import { PersistenceModule } from '../../infrastructure/persistence/persistence.module';
import { ToolsModule } from '../../tools/tools.module';
import { CoachGraphService } from './coach.graph';
import { AnalystNode } from './nodes/analyst.node';
import { CoachNode } from './nodes/coach.node';

@Module({
  imports: [LlmModule, PersistenceModule, ToolsModule, ClockModule],
  providers: [AnalystNode, CoachNode, CoachGraphService],
  exports: [CoachGraphService],
})
export class CoachModule {}

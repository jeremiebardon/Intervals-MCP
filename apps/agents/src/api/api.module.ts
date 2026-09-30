import { Module } from '@nestjs/common';
import { CoachModule } from '../graphs/coach/coach.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { HealthController } from './health.controller';

@Module({
  imports: [CoachModule],
  controllers: [AgentController, HealthController],
  providers: [AgentService],
})
export class ApiModule {}

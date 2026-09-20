import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ApplicationModule } from './application/application.module';
import { AgentController } from './http/agent.controller';

@Module({
  imports: [InfrastructureModule, ApplicationModule],
  controllers: [AgentController],
})
export class AppModule {}

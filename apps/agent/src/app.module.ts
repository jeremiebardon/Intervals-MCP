import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ApplicationModule } from './application/application.module';
import { AgentController } from './http/agent.controller';
import { AskCommand } from './cli/ask.command';

@Module({
  imports: [InfrastructureModule, ApplicationModule],
  controllers: [AgentController],
  providers: [AskCommand],
})
export class AppModule {}

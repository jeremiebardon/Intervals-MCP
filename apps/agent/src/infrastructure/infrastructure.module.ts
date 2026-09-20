import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentInvokerPort } from '../application/ports/agent-invoker.port';
import { LangGraphAgentAdapter } from './langgraph/langgraph-agent.adapter';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [{ provide: AgentInvokerPort, useClass: LangGraphAgentAdapter }],
  exports: [AgentInvokerPort],
})
export class InfrastructureModule {}

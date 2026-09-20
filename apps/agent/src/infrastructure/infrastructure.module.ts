import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { AgentInvokerPort } from '../application/ports/agent-invoker.port';
import { LangGraphAgentAdapter } from './langgraph/langgraph-agent.adapter';

// Resolves at both apps/agent/src/infrastructure and apps/agent/dist/infrastructure
// (same depth below the repo root), so this reaches the repo-root .env
// regardless of process.cwd(). A missing file is harmless (Docker images
// exclude .env; env comes from compose).
const REPO_ROOT_ENV_PATH = resolve(__dirname, '../../../../.env');

@Module({
  imports: [ConfigModule.forRoot({ envFilePath: REPO_ROOT_ENV_PATH })],
  providers: [{ provide: AgentInvokerPort, useClass: LangGraphAgentAdapter }],
  exports: [AgentInvokerPort],
})
export class InfrastructureModule {}

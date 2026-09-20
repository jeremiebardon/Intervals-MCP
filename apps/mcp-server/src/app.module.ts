import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ApplicationModule } from './application/application.module';
import { McpModule } from './mcp/mcp.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [InfrastructureModule, ApplicationModule, McpModule, HealthModule],
})
export class AppModule {}

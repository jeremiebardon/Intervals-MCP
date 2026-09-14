import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { startMcpServer } from './mcp/server';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false, // stdout is reserved for the MCP protocol; nothing else may write to it
  });
  await startMcpServer(app);
}

bootstrap();

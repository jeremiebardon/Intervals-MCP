import './instrumentation';
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { telemetry } from './instrumentation';
import { createServiceErrorHandler } from './cli/service-error-handler';

async function bootstrap(): Promise<void> {
  await CommandFactory.run(AppModule, {
    logger: ['error', 'warn'],
    serviceErrorHandler: createServiceErrorHandler(() =>
      telemetry.forceFlush(),
    ),
  });
}

bootstrap()
  .then(async () => {
    await telemetry.forceFlush();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await telemetry.forceFlush();
    process.exit(1);
  });

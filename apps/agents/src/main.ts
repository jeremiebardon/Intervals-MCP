import { tracerProvider } from './instrumentation';
import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);
  await app.listen(config.get('port', { infer: true }), '0.0.0.0');
}

bootstrap().catch(async (err) => {
  console.error(err);
  // Phoenix being down must not hide the startup error.
  await tracerProvider.forceFlush().catch(() => undefined);
  process.exit(1);
});

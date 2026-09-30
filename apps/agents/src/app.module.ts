import { Module } from '@nestjs/common';
import { ApiModule } from './api/api.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule, ApiModule],
})
export class AppModule {}

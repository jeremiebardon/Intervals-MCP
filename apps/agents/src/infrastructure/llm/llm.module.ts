import { Module } from '@nestjs/common';
import { LlmProviderService } from './llm.service';

@Module({
  providers: [LlmProviderService],
  exports: [LlmProviderService],
})
export class LlmModule {}

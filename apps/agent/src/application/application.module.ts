import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AskQuestionUseCase } from './use-cases/ask-question.use-case';

@Module({
  imports: [InfrastructureModule],
  providers: [AskQuestionUseCase],
  exports: [AskQuestionUseCase],
})
export class ApplicationModule {}

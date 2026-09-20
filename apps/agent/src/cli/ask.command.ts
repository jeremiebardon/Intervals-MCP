import { Command, CommandRunner } from 'nest-commander';
import { AskQuestionUseCase } from '../application/use-cases/ask-question.use-case';
import { Question } from '../domain/question';

@Command({ name: 'ask', description: 'Ask the agent a question' })
export class AskCommand extends CommandRunner {
  constructor(private readonly askQuestion: AskQuestionUseCase) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const question = passedParams.join(' ');
    if (!question) {
      throw new Error(
        'usage: pnpm --filter @intervals/agent ask "<question>"',
      );
    }
    const answer = await this.askQuestion.execute(new Question(question));
    console.log(answer.value);
  }
}

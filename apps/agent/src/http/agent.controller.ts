import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AskQuestionUseCase } from '../application/use-cases/ask-question.use-case';
import { Question, InvalidQuestionError } from '../domain/question';

interface InvokeRequestBody {
  question?: unknown;
}

interface InvokeResponseBody {
  answer: string;
}

@Controller()
export class AgentController {
  constructor(private readonly askQuestion: AskQuestionUseCase) {}

  @Post('invoke')
  async invoke(@Body() body: InvokeRequestBody): Promise<InvokeResponseBody> {
    let question: Question;
    try {
      question = new Question(body.question);
    } catch (err) {
      if (err instanceof InvalidQuestionError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const answer = await this.askQuestion.execute(question);
    return { answer: answer.value };
  }
}

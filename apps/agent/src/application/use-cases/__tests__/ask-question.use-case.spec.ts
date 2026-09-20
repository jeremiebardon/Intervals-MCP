import { AskQuestionUseCase } from '../ask-question.use-case';
import { AgentInvokerPort } from '../../ports/agent-invoker.port';
import { Question } from '../../../domain/question';
import { Answer } from '../../../domain/answer';

class FakeAgentInvoker extends AgentInvokerPort {
  invoke = jest.fn(async (question: Question) => new Answer(`echo: ${question.value}`));
}

describe('AskQuestionUseCase', () => {
  it('delegates to the agent invoker port and returns its answer', async () => {
    const invoker = new FakeAgentInvoker();
    const useCase = new AskQuestionUseCase(invoker);

    const answer = await useCase.execute(new Question('how is my form?'));

    expect(invoker.invoke).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'how is my form?' }),
    );
    expect(answer.value).toBe('echo: how is my form?');
  });
});

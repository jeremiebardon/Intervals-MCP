import { BadRequestException } from '@nestjs/common';
import { AgentController } from '../agent.controller';
import { AskQuestionUseCase } from '../../application/use-cases/ask-question.use-case';
import { Answer } from '../../domain/answer';

describe('AgentController', () => {
  it('returns the answer for a valid question', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue(new Answer('42')),
    } as unknown as AskQuestionUseCase;
    const controller = new AgentController(useCase);

    await expect(
      controller.invoke({ question: 'what is my FTP?' }),
    ).resolves.toEqual({ answer: '42' });
  });

  it('throws BadRequestException for a non-string question', async () => {
    const useCase = { execute: jest.fn() } as unknown as AskQuestionUseCase;
    const controller = new AgentController(useCase);

    await expect(controller.invoke({ question: 42 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for an empty question', async () => {
    const useCase = { execute: jest.fn() } as unknown as AskQuestionUseCase;
    const controller = new AgentController(useCase);

    await expect(controller.invoke({ question: '' })).rejects.toThrow(
      BadRequestException,
    );
  });
});

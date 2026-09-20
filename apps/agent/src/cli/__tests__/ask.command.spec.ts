import { AskCommand } from '../ask.command';
import { AskQuestionUseCase } from '../../application/use-cases/ask-question.use-case';
import { Answer } from '../../domain/answer';

describe('AskCommand', () => {
  it('prints the answer for the given question', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue(new Answer('you rode 40km')),
    } as unknown as AskQuestionUseCase;
    const command = new AskCommand(useCase);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await command.run(['how', 'far', 'did', 'I', 'ride?']);

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'how far did I ride?' }),
    );
    expect(logSpy).toHaveBeenCalledWith('you rode 40km');
    logSpy.mockRestore();
  });

  it('throws when no question is given', async () => {
    const useCase = { execute: jest.fn() } as unknown as AskQuestionUseCase;
    const command = new AskCommand(useCase);

    await expect(command.run([])).rejects.toThrow(/usage:/);
  });
});

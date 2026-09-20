import { Module } from '@nestjs/common';
import { CommandFactory, CommandRunnerService } from 'nest-commander';
import { AskCommand } from '../ask.command';
import { AskQuestionUseCase } from '../../application/use-cases/ask-question.use-case';
import { Answer } from '../../domain/answer';

// Regression: the documented invocation is `node dist/cli.js "<question>"`
// (no `ask` token). This goes through real commander dispatch, not run().
describe('AskCommand dispatch via nest-commander', () => {
  const execute = jest.fn();

  @Module({
    providers: [AskCommand, { provide: AskQuestionUseCase, useValue: { execute } }],
  })
  class TestModule {}

  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    execute.mockReset().mockResolvedValue(new Answer('you rode 40km'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => logSpy.mockRestore());

  async function dispatch(...args: string[]): Promise<void> {
    const app = await CommandFactory.createWithoutRunning(TestModule, {
      logger: false,
      errorHandler: (err) => {
        throw err;
      },
    });
    try {
      await app.get(CommandRunnerService).run(['node', 'cli.js', ...args]);
    } finally {
      await app.close();
    }
  }

  it('runs ask when invoked with a bare question (no subcommand token)', async () => {
    await dispatch('how far did I ride?');

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'how far did I ride?' }),
    );
    expect(logSpy).toHaveBeenCalledWith('you rode 40km');
  });

  it('still accepts the explicit ask token', async () => {
    await dispatch('ask', 'how far did I ride?');

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'how far did I ride?' }),
    );
  });
});

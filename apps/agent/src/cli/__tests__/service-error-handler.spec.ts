import { createServiceErrorHandler } from '../service-error-handler';

describe('createServiceErrorHandler', () => {
  it('logs the error, flushes telemetry, and exits with code 1', async () => {
    const forceFlush = jest.fn().mockResolvedValue(undefined);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const exitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    const handler = createServiceErrorHandler(forceFlush);
    await handler(new Error('usage: pnpm --filter @intervals/agent ask "<question>"'));

    expect(errorSpy).toHaveBeenCalledWith(
      'usage: pnpm --filter @intervals/agent ask "<question>"',
    );
    expect(forceFlush).toHaveBeenCalledTimes(1);
    expect(exitSpy).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});

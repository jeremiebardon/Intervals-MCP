/**
 * `nest-commander`'s `CommandRunnerService.run()` does:
 *   await this.commander.parseAsync(args).catch(this.options.serviceErrorHandler)
 * The DEFAULT `serviceErrorHandler` only logs to stderr and resolves — it does
 * NOT rethrow. That means `CommandFactory.run()`'s returned promise always
 * resolves, even when a command's `run()` throws, which would make cli.ts's
 * `bootstrap().then()` branch fire and exit 0 on command failures.
 *
 * Passing this handler as `serviceErrorHandler` closes that gap: since it
 * calls `process.exit(1)` itself, execution never returns to `bootstrap()`'s
 * `.then()`, so the wrong exit code can't happen.
 */
export function createServiceErrorHandler(
  forceFlush: () => Promise<void>,
): (err: Error) => Promise<void> {
  return async (err: Error): Promise<void> => {
    console.error(err.message);
    await forceFlush();
    process.exit(1);
  };
}

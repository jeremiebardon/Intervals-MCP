import { tool } from '@langchain/core/tools';
import { z, ZodError } from 'zod';
import { IntervalsClient } from '../infrastructure/intervals/intervals.client';

export interface ToolDeps {
  intervals: IntervalsClient;
  now: () => Date;
}

const MAX_ERROR_LENGTH = 500;

// Errors go back to the model as a tool result, so it can retry with other
// arguments instead of the whole run failing.
export function toToolError(err: unknown): { code: string; message: string } {
  if (err instanceof ZodError) {
    const message =
      err.message.length > MAX_ERROR_LENGTH
        ? `${err.message.slice(0, MAX_ERROR_LENGTH)}...`
        : err.message;
    return { code: 'UPSTREAM_CONTRACT_MISMATCH', message };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { code: 'INTERNAL_ERROR', message };
}

export function defineTool<S extends z.ZodObject, O>(config: {
  name: string;
  description: string;
  schema: S;
  run: (deps: ToolDeps, input: z.infer<S>) => O | Promise<O>;
}) {
  return (deps: ToolDeps) =>
    tool(
      async (input: z.infer<S>) => {
        try {
          return JSON.stringify(await config.run(deps, input));
        } catch (err) {
          return JSON.stringify(toToolError(err));
        }
      },
      {
        name: config.name,
        description: config.description,
        schema: config.schema,
      },
    );
}

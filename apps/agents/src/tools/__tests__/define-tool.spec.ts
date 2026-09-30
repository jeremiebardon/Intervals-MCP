import { z } from 'zod';
import { defineTool, ToolDeps } from '../define-tool';
import { IntervalsClient } from '../../infrastructure/intervals/intervals.client';

const deps: ToolDeps = {
  intervals: {} as IntervalsClient,
  now: () => new Date('2026-09-20T10:00:00Z'),
};

function echoTool(run: () => unknown) {
  return defineTool({
    name: 'echo',
    description: 'test tool',
    schema: z.object({ value: z.string() }),
    run,
  })(deps);
}

describe('defineTool', () => {
  it('returns the result as JSON', async () => {
    const tool = echoTool(() => ({ ok: true }));

    await expect(tool.invoke({ value: 'x' })).resolves.toBe('{"ok":true}');
  });

  it('returns errors to the model instead of throwing', async () => {
    const tool = echoTool(() => {
      throw new Error('boom');
    });

    await expect(tool.invoke({ value: 'x' })).resolves.toBe(
      '{"code":"INTERNAL_ERROR","message":"boom"}',
    );
  });

  it('flags upstream schema mismatches', async () => {
    const tool = echoTool(() => z.object({ id: z.string() }).parse({}));

    const result = JSON.parse(await tool.invoke({ value: 'x' })) as {
      code: string;
    };
    expect(result.code).toBe('UPSTREAM_CONTRACT_MISMATCH');
  });
});

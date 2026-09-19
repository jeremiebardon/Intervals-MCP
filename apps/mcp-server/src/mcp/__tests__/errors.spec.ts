import { z } from 'zod';
import { toMcpError } from '../errors';

describe('toMcpError', () => {
  it('maps an Error to a generic error code with its message', () => {
    const result = toMcpError(new Error('upstream timed out'));
    expect(result).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'upstream timed out',
    });
  });

  it('maps a non-Error thrown value to a generic message', () => {
    const result = toMcpError('boom');
    expect(result).toEqual({ code: 'INTERNAL_ERROR', message: 'boom' });
  });

  it('maps a ZodError to UPSTREAM_CONTRACT_MISMATCH with a truncated message', () => {
    const schema = z.object({ id: z.string() });
    const parseResult = schema.safeParse({ id: 123 });
    expect(parseResult.success).toBe(false);
    if (parseResult.success) return;

    const result = toMcpError(parseResult.error);

    expect(result.code).toBe('UPSTREAM_CONTRACT_MISMATCH');
    expect(result.message.length).toBeLessThanOrEqual(503);
  });
});

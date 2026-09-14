import { toMcpError } from './errors';

describe('toMcpError', () => {
  it('maps an Error to a generic error code with its message', () => {
    const result = toMcpError(new Error('upstream timed out'));
    expect(result).toEqual({ code: 'INTERNAL_ERROR', message: 'upstream timed out' });
  });

  it('maps a non-Error thrown value to a generic message', () => {
    const result = toMcpError('boom');
    expect(result).toEqual({ code: 'INTERNAL_ERROR', message: 'boom' });
  });
});

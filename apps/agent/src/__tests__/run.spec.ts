import { runAgent } from '../run';

describe('runAgent', () => {
  it('returns the graph answer for a question', async () => {
    await expect(runAgent('how is my form?')).resolves.toEqual({
      answer: 'received: how is my form?',
    });
  });

  it('handles an empty question without throwing', async () => {
    await expect(runAgent('')).resolves.toEqual({ answer: 'received: ' });
  });
});

import { Answer } from '../answer';

describe('Answer', () => {
  it('holds a string value', () => {
    expect(new Answer('you rode 40km').value).toBe('you rode 40km');
  });
});

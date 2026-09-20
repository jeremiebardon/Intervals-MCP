import { Question, InvalidQuestionError } from '../question';

describe('Question', () => {
  it('holds a non-empty string', () => {
    expect(new Question('how is my form?').value).toBe('how is my form?');
  });

  it('rejects an empty string', () => {
    expect(() => new Question('')).toThrow(InvalidQuestionError);
  });

  it('rejects a whitespace-only string', () => {
    expect(() => new Question('   ')).toThrow(InvalidQuestionError);
  });

  it('rejects a non-string value', () => {
    expect(() => new Question(42)).toThrow(InvalidQuestionError);
  });
});

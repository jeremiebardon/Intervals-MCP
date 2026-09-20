export class InvalidQuestionError extends Error {}

export class Question {
  readonly value: string;

  constructor(value: unknown) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new InvalidQuestionError('question must be a non-empty string');
    }
    this.value = value;
  }
}

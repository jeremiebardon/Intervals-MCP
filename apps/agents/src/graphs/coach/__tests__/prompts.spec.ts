import { TRAINING_ANALYST_PROMPT } from '../prompts/training-analyst.prompt';
import { TRAINING_COACH_PROMPT } from '../prompts/training-coach.prompt';

describe('TRAINING_ANALYST_PROMPT', () => {
  it('names the role', () => {
    expect(TRAINING_ANALYST_PROMPT).toMatch(/training analyst/i);
  });

  it('requires facts from the tools only, never invented figures', () => {
    expect(TRAINING_ANALYST_PROMPT).toMatch(/never invent/i);
  });

  it('asks for truncation and missing data to be reported', () => {
    expect(TRAINING_ANALYST_PROMPT).toMatch(/truncated/i);
    expect(TRAINING_ANALYST_PROMPT).toMatch(/no data/i);
  });

  it('forbids advice, which belongs to the coach', () => {
    expect(TRAINING_ANALYST_PROMPT).toMatch(
      /do not give (advice|recommendations)/i,
    );
  });

  it('resolves relative periods from the date given in the message', () => {
    expect(TRAINING_ANALYST_PROMPT).toMatch(/today's date/i);
    expect(TRAINING_ANALYST_PROMPT).toMatch(/never assume the date/i);
  });

  it('delegates weekly totals and required paces to the tools instead of computing them', () => {
    expect(TRAINING_ANALYST_PROMPT).toContain('get_weekly_totals');
    expect(TRAINING_ANALYST_PROMPT).toContain('calculate_race_pace');
    expect(TRAINING_ANALYST_PROMPT).toMatch(
      /never (add up|do arithmetic|compute)/i,
    );
  });

  it('defines weeks and states the exact range used', () => {
    expect(TRAINING_ANALYST_PROMPT).toMatch(/monday/i);
    expect(TRAINING_ANALYST_PROMPT).toMatch(/exact date range/i);
  });
});

describe('TRAINING_COACH_PROMPT', () => {
  it('names the role', () => {
    expect(TRAINING_COACH_PROMPT).toMatch(/training coach/i);
  });

  it('answers from the analyst report only', () => {
    expect(TRAINING_COACH_PROMPT).toMatch(/only.*analysis/i);
  });

  it('matches the language of the question', () => {
    expect(TRAINING_COACH_PROMPT).toMatch(/same language as the question/i);
  });

  it('says so when the analysis holds no data', () => {
    expect(TRAINING_COACH_PROMPT).toMatch(/no data/i);
  });

  it('gives no medical advice', () => {
    expect(TRAINING_COACH_PROMPT).toMatch(/medical/i);
  });

  it('never exposes the analysis, the analyst or the date header', () => {
    expect(TRAINING_COACH_PROMPT).toMatch(/never mention the analysis/i);
    expect(TRAINING_COACH_PROMPT).toMatch(/repeat the date header/i);
  });

  it("uses today's date to judge how far away an event is", () => {
    expect(TRAINING_COACH_PROMPT).toMatch(/today's date/i);
  });
});

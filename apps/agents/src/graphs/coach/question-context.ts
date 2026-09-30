import type { BaseMessage } from '@langchain/core/messages';
import { currentDateLine } from './current-date';
import { CoachState } from './state';

export function lastText(messages: BaseMessage[]): string {
  return messages.at(-1)?.text ?? '';
}

/** The latest question, prefixed with today's date so relative periods resolve. */
export function questionContext(state: CoachState, now: Date): string {
  const question = lastText(state.messages.filter((m) => m.type === 'human'));
  return `${currentDateLine(now)}\n\nQuestion:\n${question}`;
}

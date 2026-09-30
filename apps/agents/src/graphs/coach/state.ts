import { Annotation, MessagesAnnotation } from '@langchain/langgraph';

export const CoachAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  /** The analyst's factual report for the latest question. */
  analysis: Annotation<string>,
});

export type CoachState = typeof CoachAnnotation.State;

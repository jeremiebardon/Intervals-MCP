import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

export const AgentState = Annotation.Root({
  question: Annotation<string>,
  answer: Annotation<string>,
});

export type AgentStateType = typeof AgentState.State;

export function buildGraph() {
  return new StateGraph(AgentState)
    .addNode('echo', (state: AgentStateType) => ({
      answer: `received: ${state.question}`,
    }))
    .addEdge(START, 'echo')
    .addEdge('echo', END)
    .compile();
}

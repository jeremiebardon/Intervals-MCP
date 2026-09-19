import { trace } from '@opentelemetry/api';
import { buildGraph } from './graph';

const tracer = trace.getTracer('@intervals/agent');
const graph = buildGraph();

export interface AgentResult {
  answer: string;
}

export async function runAgent(question: string): Promise<AgentResult> {
  return tracer.startActiveSpan('agent.invoke', async (span) => {
    try {
      span.setAttribute('agent.question.length', question.length);
      const state = await graph.invoke({ question });
      return { answer: state.answer };
    } finally {
      span.end();
    }
  });
}

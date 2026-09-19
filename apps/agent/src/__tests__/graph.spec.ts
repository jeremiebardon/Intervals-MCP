import { buildGraph } from '../graph';

describe('agent graph', () => {
  it('runs the echo node and puts its output on the answer channel', async () => {
    const graph = buildGraph();

    const result = await graph.invoke({ question: 'how is my form?' });

    expect(result.answer).toBe('received: how is my form?');
  });

  it('leaves the question channel untouched', async () => {
    const graph = buildGraph();

    const result = await graph.invoke({ question: 'what is on my plan?' });

    expect(result.question).toBe('what is on my plan?');
  });
});

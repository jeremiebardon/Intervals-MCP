import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AIMessageChunk } from '@langchain/core/messages';
import { Observable } from 'rxjs';
import { CoachGraphService } from '../graphs/coach/coach.graph';
import { RunEvent, StreamRunDto } from './dto/stream-run.dto';

// Hard cap on graph steps (the analyst's model/tool round trips count), so a
// model stuck calling tools cannot run up an unbounded bill.
const MAX_STEPS = 25;

@Injectable()
export class AgentService {
  constructor(private readonly coachGraph: CoachGraphService) {}

  /**
   * Runs the coach graph on one thread and streams the analyst's tool calls
   * and the coach's answer tokens. Unsubscribing (client disconnect) aborts
   * the run.
   */
  streamRun({ input, threadId }: StreamRunDto): Observable<RunEvent> {
    const graph = this.coachGraph.getCompiledGraph();
    const thread = threadId ?? randomUUID();

    return new Observable<RunEvent>((subscriber) => {
      const abort = new AbortController();
      subscriber.next({ type: 'thread', threadId: thread });

      (async () => {
        const events = graph.streamEvents(
          { messages: [{ role: 'user', content: input }] },
          {
            version: 'v2',
            configurable: { thread_id: thread },
            recursionLimit: MAX_STEPS,
            signal: abort.signal,
          },
        );
        for await (const event of events) {
          if (event.event === 'on_tool_start') {
            subscriber.next({ type: 'tool', name: event.name });
          } else if (
            event.event === 'on_chat_model_stream' &&
            event.metadata.langgraph_node === 'coach'
          ) {
            const chunk: unknown = event.data.chunk;
            if (AIMessageChunk.isInstance(chunk) && chunk.text) {
              subscriber.next({ type: 'token', content: chunk.text });
            }
          }
        }
        subscriber.next({ type: 'end' });
        subscriber.complete();
      })().catch((err: unknown) => subscriber.error(err));

      return () => abort.abort();
    });
  }
}

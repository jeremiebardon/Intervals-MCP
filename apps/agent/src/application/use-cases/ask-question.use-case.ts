import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import {
  MimeType,
  OpenInferenceSpanKind,
  SemanticConventions,
} from '@arizeai/openinference-semantic-conventions';
import { AgentInvokerPort } from '../ports/agent-invoker.port';
import { Question } from '../../domain/question';
import { Answer } from '../../domain/answer';

const tracer = trace.getTracer('@intervals/agent');

@Injectable()
export class AskQuestionUseCase {
  constructor(private readonly agentInvoker: AgentInvokerPort) {}

  async execute(question: Question): Promise<Answer> {
    return tracer.startActiveSpan('agent.invoke', async (span) => {
      try {
        span.setAttribute(
          SemanticConventions.OPENINFERENCE_SPAN_KIND,
          OpenInferenceSpanKind.AGENT,
        );
        span.setAttribute(SemanticConventions.INPUT_VALUE, question.value);
        span.setAttribute(SemanticConventions.INPUT_MIME_TYPE, MimeType.TEXT);

        const answer = await this.agentInvoker.invoke(question);

        span.setAttribute(SemanticConventions.OUTPUT_VALUE, answer.value);
        span.setAttribute(SemanticConventions.OUTPUT_MIME_TYPE, MimeType.TEXT);
        return answer;
      } finally {
        span.end();
      }
    });
  }
}

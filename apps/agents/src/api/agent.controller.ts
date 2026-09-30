import { Body, Controller, MessageEvent, Post, Sse } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { AgentService } from './agent.service';
import { streamRunSchema } from './dto/stream-run.dto';
import type { StreamRunDto } from './dto/stream-run.dto';
import { ZodValidationPipe } from './zod-validation.pipe';

@Controller('agents')
export class AgentController {
  constructor(private readonly agents: AgentService) {}

  // @Sse registers a GET route; @Post, applied after it, turns it into a POST
  // so the question travels in the body. Nest's SSE handling is method-agnostic.
  @Post('coach/stream')
  @Sse()
  streamCoach(
    @Body(new ZodValidationPipe(streamRunSchema)) body: StreamRunDto,
  ): Observable<MessageEvent> {
    return this.agents
      .streamRun(body)
      .pipe(map((event) => ({ type: event.type, data: event })));
  }
}

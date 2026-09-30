import { Inject, Injectable } from '@nestjs/common';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { CLOCK } from '../../../infrastructure/clock/clock.module';
import type { Clock } from '../../../infrastructure/clock/clock.module';
import { LlmProviderService } from '../../../infrastructure/llm/llm.service';
import { TRAINING_COACH_PROMPT } from '../prompts/training-coach.prompt';
import { questionContext } from '../question-context';
import { CoachState } from '../state';

/** Answers the athlete from the analyst's report; has no tools. */
@Injectable()
export class CoachNode {
  constructor(
    private readonly llm: LlmProviderService,
    @Inject(CLOCK) private readonly now: Clock,
  ) {}

  async run(
    state: CoachState,
    config: LangGraphRunnableConfig,
  ): Promise<Partial<CoachState>> {
    const answer = await this.llm.getModel().invoke(
      [
        { role: 'system', content: TRAINING_COACH_PROMPT },
        {
          role: 'user',
          content: `${questionContext(state, this.now())}\n\nAnalysis:\n${state.analysis}`,
        },
      ],
      config,
    );
    return { messages: [answer] };
  }
}

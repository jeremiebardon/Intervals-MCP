import { Inject, Injectable } from '@nestjs/common';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';
import { createAgent } from 'langchain';
import { CLOCK } from '../../../infrastructure/clock/clock.module';
import type { Clock } from '../../../infrastructure/clock/clock.module';
import { LlmProviderService } from '../../../infrastructure/llm/llm.service';
import { TrainingToolsService } from '../../../tools/training-tools.service';
import { TRAINING_ANALYST_PROMPT } from '../prompts/training-analyst.prompt';
import { lastText, questionContext } from '../question-context';
import { CoachState } from '../state';

function buildAnalyst(llm: LlmProviderService, tools: TrainingToolsService) {
  return createAgent({
    name: 'training-analyst',
    model: llm.getModel(),
    tools: tools.getTools(),
    systemPrompt: TRAINING_ANALYST_PROMPT,
  });
}

/** Gathers the athlete's data with the tools and writes a factual report. */
@Injectable()
export class AnalystNode {
  private readonly agent: ReturnType<typeof buildAnalyst>;

  constructor(
    llm: LlmProviderService,
    tools: TrainingToolsService,
    @Inject(CLOCK) private readonly now: Clock,
  ) {
    this.agent = buildAnalyst(llm, tools);
  }

  // Passing `config` through makes the analyst a child run, so its tool calls
  // and tokens reach the event stream and Phoenix.
  async run(
    state: CoachState,
    config: LangGraphRunnableConfig,
  ): Promise<Partial<CoachState>> {
    const result = await this.agent.invoke(
      {
        messages: [
          { role: 'user', content: questionContext(state, this.now()) },
        ],
      },
      config,
    );
    return { analysis: lastText(result.messages) };
  }
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOllama } from '@langchain/ollama';
import { AgentInvokerPort } from '../../application/ports/agent-invoker.port';
import { Question } from '../../domain/question';
import { Answer } from '../../domain/answer';

type ReactAgent = { invoke: (input: unknown) => Promise<{ messages: Array<{ content: unknown }> }> };

@Injectable()
export class LangGraphAgentAdapter
  implements AgentInvokerPort, OnModuleInit
{
  private agent!: ReactAgent;

  async onModuleInit(): Promise<void> {
    const mcpClient = new MultiServerMCPClient({
      'intervals-icu': {
        transport: 'http',
        url: process.env.MCP_SERVER_URL ?? 'http://mcp-server:3300/mcp',
      },
    });
    const tools = await mcpClient.getTools();

    const llm = new ChatOllama({
      model: process.env.OLLAMA_MODEL ?? 'gemma4:12b',
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    });

    this.agent = createReactAgent({ llm, tools }) as unknown as ReactAgent;
  }

  async invoke(question: Question): Promise<Answer> {
    const result = await this.agent.invoke({
      messages: [{ role: 'user', content: question.value }],
    });
    const lastMessage = result.messages[result.messages.length - 1];
    return new Answer(String(lastMessage.content));
  }
}

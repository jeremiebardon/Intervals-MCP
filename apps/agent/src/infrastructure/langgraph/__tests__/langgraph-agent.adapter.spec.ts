import { LangGraphAgentAdapter } from '../langgraph-agent.adapter';
import { Question } from '../../../domain/question';

const mockGetTools = jest.fn().mockResolvedValue([]);
const mockMcpClientCtor = jest.fn();
jest.mock('@langchain/mcp-adapters', () => ({
  MultiServerMCPClient: jest.fn().mockImplementation((config: unknown) => {
    mockMcpClientCtor(config);
    return { getTools: mockGetTools };
  }),
}));

jest.mock('@langchain/ollama', () => ({
  ChatOllama: jest.fn().mockImplementation((config: unknown) => ({
    __config: config,
  })),
}));

const mockAgentInvoke = jest.fn();
jest.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: jest.fn().mockImplementation(() => ({
    invoke: mockAgentInvoke,
  })),
}));

describe('LangGraphAgentAdapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, MCP_SERVER_URL: 'http://mcp-server:3300/mcp' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('connects to the MCP server over HTTP using MCP_SERVER_URL', async () => {
    const adapter = new LangGraphAgentAdapter();
    await adapter.onModuleInit();

    expect(mockMcpClientCtor).toHaveBeenCalledWith({
      'intervals-icu': {
        transport: 'http',
        url: 'http://mcp-server:3300/mcp',
      },
    });
  });

  it('invokes the react agent and returns its last message as the answer', async () => {
    mockAgentInvoke.mockResolvedValue({
      messages: [{ content: 'ignored' }, { content: 'you rode 40km' }],
    });
    const adapter = new LangGraphAgentAdapter();
    await adapter.onModuleInit();

    const answer = await adapter.invoke(new Question('how far did I ride?'));

    expect(mockAgentInvoke).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'how far did I ride?' }],
    });
    expect(answer.value).toBe('you rode 40km');
  });
});

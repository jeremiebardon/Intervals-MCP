import { traceTool } from '@arizeai/phoenix-otel';

export function withToolSpan<I, O>(
  toolName: string,
  handler: (input: I) => Promise<O>,
): (input: I) => Promise<O> {
  return traceTool(handler, { name: `mcp.tool/${toolName}` });
}

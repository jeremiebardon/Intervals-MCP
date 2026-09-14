// Phase 2 replaces this body with an OTel span per the blueprint's
// `mcp.tool/<name>` wrapper pattern. Tool code calling withToolSpan
// does not change when that lands.
export function withToolSpan<I, O>(
  _toolName: string,
  handler: (input: I) => Promise<O>,
): (input: I) => Promise<O> {
  return async (input: I): Promise<O> => handler(input);
}

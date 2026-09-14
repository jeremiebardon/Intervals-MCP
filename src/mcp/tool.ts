import { ZodType } from 'zod';

export interface McpTool<I, O> {
  name: string;
  description: string;
  inputSchema: ZodType<I>;
  execute(input: I): Promise<O>;
}

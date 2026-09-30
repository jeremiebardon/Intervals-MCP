import { z } from 'zod';

export const streamRunSchema = z.object({
  input: z.string().trim().min(1),
  /** Continue an existing conversation; omitted starts a new thread. */
  threadId: z.string().min(1).optional(),
});

export type StreamRunDto = z.infer<typeof streamRunSchema>;

/** Events sent to the client, one per SSE message. */
export type RunEvent =
  | { type: 'thread'; threadId: string }
  | { type: 'tool'; name: string }
  | { type: 'token'; content: string }
  | { type: 'end' };

import { ZodError } from 'zod';

const MAX_MESSAGE_LENGTH = 500;

function truncate(message: string): string {
  return message.length > MAX_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_MESSAGE_LENGTH)}...`
    : message;
}

export function toMcpError(err: unknown): { code: string; message: string } {
  if (err instanceof ZodError) {
    return {
      code: 'UPSTREAM_CONTRACT_MISMATCH',
      message: truncate(err.message),
    };
  }
  if (err instanceof Error) {
    return { code: 'INTERNAL_ERROR', message: err.message };
  }
  return { code: 'INTERNAL_ERROR', message: String(err) };
}

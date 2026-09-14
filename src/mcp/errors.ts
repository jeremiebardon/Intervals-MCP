export function toMcpError(err: unknown): { code: string; message: string } {
  if (err instanceof Error) {
    return { code: 'INTERNAL_ERROR', message: err.message };
  }
  return { code: 'INTERNAL_ERROR', message: String(err) };
}

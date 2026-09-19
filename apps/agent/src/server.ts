import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { runAgent } from './run';

const DEFAULT_PORT = 8787;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function handleInvoke(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const raw = await readBody(req);

  let question: unknown;
  try {
    question = (JSON.parse(raw) as { question?: unknown }).question;
  } catch {
    sendJson(res, 400, { error: 'body must be valid JSON' });
    return;
  }

  if (typeof question !== 'string') {
    sendJson(res, 400, { error: 'body must be {"question": string}' });
    return;
  }

  sendJson(res, 200, await runAgent(question));
}

export function startAgentServer(): void {
  const port = Number(process.env.AGENT_PORT ?? DEFAULT_PORT);

  const server = createServer((req, res) => {
    void (async () => {
      if (req.method === 'GET' && req.url === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
      }
      if (req.method === 'POST' && req.url === '/invoke') {
        await handleInvoke(req, res);
        return;
      }
      sendJson(res, 404, { error: 'not found' });
    })().catch(() => sendJson(res, 500, { error: 'internal error' }));
  });

  server.listen(port, () => {
    console.log(`agent listening on :${port}`);
  });
}

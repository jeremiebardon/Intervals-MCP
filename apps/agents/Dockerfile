FROM node:24-slim
WORKDIR /repo
RUN npm install -g pnpm@12.4.1
COPY . .
RUN pnpm install --frozen-lockfile --filter @intervals/agents...

WORKDIR /repo/apps/agents
RUN pnpm build
EXPOSE 2024
# NestJS server: SSE streaming at POST /agents/coach/stream. Threads are kept
# in memory (MemorySaver) and lost on restart.
CMD ["pnpm", "start"]

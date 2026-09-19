FROM node:24-slim

WORKDIR /repo
RUN npm install -g pnpm@12.4.1

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter @intervals/agent

ENV AGENT_PORT=8787
EXPOSE 8787
CMD ["node", "apps/agent/dist/main.js"]

FROM node:24-slim AS deps
WORKDIR /repo
RUN npm install -g pnpm@12.4.1
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS dev
ENV AGENT_PORT=8787
EXPOSE 8787
CMD ["pnpm", "--filter", "@intervals/agent", "start:dev"]

FROM deps AS build
RUN pnpm turbo build --filter @intervals/agent

FROM node:24-slim AS production
WORKDIR /repo
RUN npm install -g pnpm@12.4.1
COPY . .
RUN pnpm install --frozen-lockfile --prod --filter @intervals/agent...
COPY --from=build /repo/apps/agent/dist ./apps/agent/dist
COPY --from=build /repo/packages/instrumentation/dist ./packages/instrumentation/dist
ENV AGENT_PORT=8787
EXPOSE 8787
CMD ["node", "apps/agent/dist/main.js"]

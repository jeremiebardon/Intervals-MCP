FROM node:24-slim AS deps
WORKDIR /repo
RUN npm install -g pnpm@12.4.1
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS dev
ENV MCP_PORT=3300
EXPOSE 3300
CMD ["pnpm", "--filter", "@intervals/mcp-server", "start:dev"]

FROM deps AS build
RUN pnpm turbo build --filter @intervals/mcp-server

FROM node:24-slim AS production
WORKDIR /repo
RUN npm install -g pnpm@12.4.1
COPY . .
RUN pnpm install --frozen-lockfile --prod --filter @intervals/mcp-server...
COPY --from=build /repo/apps/mcp-server/dist ./apps/mcp-server/dist
COPY --from=build /repo/packages/instrumentation/dist ./packages/instrumentation/dist
ENV MCP_PORT=3300
EXPOSE 3300
CMD ["node", "apps/mcp-server/dist/main.js"]

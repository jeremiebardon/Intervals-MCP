# MCP Streamable HTTP + Agent NestJS/Hexagonal + Tiered Compose — Design

Status: approved
Date: 2026-09-19
Scope: transport change + Dockerization for `@intervals/mcp-server`;
full rewrite of `@intervals/agent` as a NestJS app in hexagonal
(ports & adapters) style; dev/preprod/prod environment management for
`docker-compose.yml`; health/liveness/Prometheus metrics on both apps.
See `intervals-mcp-blueprint.md` for the wider project and
`docs/superpowers/specs/2026-09-13-phase1-nestjs-hexagonal-design.md`
for the mcp-server's original hexagonal design (this spec extends it,
does not replace it).

## Goal

Four things, in one coordinated change:

1. **mcp-server: stdio → Streamable HTTP.** Drop stdio entirely; the
   server becomes a real network service using the current MCP spec's
   Streamable HTTP transport (not the legacy two-endpoint SSE
   transport, which predates the spec revision this repo targets).
2. **agent: rewrite as NestJS + hexagonal**, mirroring mcp-server's
   existing domain/application/infrastructure split. The agent's
   outbound MCP client switches from spawning mcp-server as a stdio
   subprocess to calling it over the network, now that mcp-server is a
   real service.
3. **Tiered docker-compose**: one `docker-compose.yml` (prod-shaped)
   used as-is for preprod/prod, one dev-only `docker-compose.override.yml`
   (bind mounts + hot reload), one env file per tier.
4. **Health, liveness, and Prometheus metrics** on both apps, since
   both are now long-lived NestJS HTTP servers in compose.

## Non-goals

- Actual preprod/prod deployment tooling (CI, remote hosts, a secrets
  manager). This spec makes the config environment-aware; it does not
  deploy anywhere. ("Structure now, deploy later.")
- MCP spec Axis-A auth (OAuth 2.1 resource server) for the mcp-server's
  HTTP endpoint. The server is reachable only inside the compose
  network / localhost, never publicly exposed — that remains blueprint
  Phase 4's auth half, deferred.
- A live intervals.icu ping on every mcp-server readiness probe. The
  API key is validated lazily by design (first tool call, not startup);
  readiness checks configuration completeness instead.
- Custom Prometheus business metrics (request counters, tool-call
  histograms). Only the `/metrics` endpoint + default Node process
  metrics ship now; specific metrics are a follow-up once there's
  something concrete to measure.
- A `prometheus` service scraping these endpoints in docker-compose.
  Just the endpoints, for now.
- Reimplementing LangGraph's tool-calling loop. `createReactAgent`
  keeps owning it; hexagonal boundaries wrap it, they don't replace it.
- Splitting the agent's outbound port into separate `LlmPort` /
  `McpToolsPort`. One `AgentInvokerPort` is enough while there is one
  delivery mechanism (LangGraph) behind it.

## Part 1 — mcp-server: Streamable HTTP transport

- `main.ts` switches from `NestFactory.createApplicationContext` to a
  full `NestFactory.create(AppModule)` HTTP application (Nest's default
  Express platform), listening on `MCP_PORT` (default `3300`). The `logger: ['error',
  'warn']` restriction is removed — it existed only because stdio
  shares stdout with the protocol; HTTP has no such conflict.
- A new `McpController` (`@Controller('mcp')`) exposes `POST`, `GET`,
  and `DELETE /mcp`, each delegating the raw request/response
  (`@Req()`, `@Res({ passthrough: false })`) to a `McpTransportService`
  that owns one `StreamableHTTPServerTransport` instance (stateless
  mode — no session store, since there is exactly one long-lived agent
  client and the tools are all read-only queries).
- `startMcpServer`'s tool-registration loop (`registerTool` per
  `McpTool`) is unchanged; only the transport underneath changes.
- `StdioServerTransport` and its import are deleted.

## Part 2 — agent: NestJS + hexagonal rewrite

```
apps/agent/src/
├── domain/
│   ├── question.ts                 # Question value object, validates non-empty
│   └── answer.ts                   # Answer value object
├── application/
│   ├── ports/
│   │   └── agent-invoker.port.ts   # abstract class AgentInvokerPort { invoke(q: Question): Promise<Answer> }
│   ├── use-cases/
│   │   └── ask-question.use-case.ts   # owns the OTel span (moved from run.ts), delegates to the port
│   └── application.module.ts
├── infrastructure/
│   ├── langgraph/
│   │   └── langgraph-agent.adapter.ts  # ChatOllama + MultiServerMCPClient({transport:'http', url: MCP_SERVER_URL}) + createReactAgent
  │       # MCP_SERVER_URL default in compose: http://mcp-server:3300/mcp
│   └── infrastructure.module.ts        # ConfigModule + { provide: AgentInvokerPort, useClass: LangGraphAgentAdapter }
├── http/
│   └── agent.controller.ts         # POST /invoke, GET /health/live, GET /health/ready — replaces server.ts
├── cli/
│   └── ask.command.ts              # nest-commander Command — replaces manual argv parsing in cli.ts
├── health/
│   └── ... (see Part 4)
├── instrumentation.ts               # unchanged: registerTelemetry + manual LangChain instrumentation, first import
├── main.ts                          # NestFactory.create(AppModule).listen(port)
├── cli.ts                           # thin bootstrap: import './instrumentation'; CommandFactory.run(AppModule)
└── app.module.ts                    # imports Infrastructure/Application modules; declares AgentController + AskCommand directly
```

Key decisions:

- `graph.ts`, `run.ts`, `server.ts` are deleted. Graph-building logic
  moves into `LangGraphAgentAdapter`; tracing moves into
  `AskQuestionUseCase`; the HTTP surface moves into `AgentController`.
- The MCP client no longer spawns a subprocess or forwards
  `INTERVALS_API_KEY`/`INTERVALS_ATHLETE_ID` through spawn `env` — it
  connects once to `MCP_SERVER_URL` over HTTP. Those credentials now go
  straight into the `mcp-server` container's own env file and never
  pass through the agent.
- `AgentController` and `AskCommand` are declared directly on
  `AppModule` rather than getting their own module — there is exactly
  one of each, unlike mcp-server's seven tools, which justify
  `McpModule`. Don't add a module layer with nothing to group.
- `nest-commander` is a new dependency for the CLI, replacing hand-rolled
  `process.argv` parsing with Nest's idiomatic CLI pattern.
- `instrumentation.ts` keeps its current shape and import-order
  constraint (must run before LangChain/LangGraph imports so the
  callback manager is patched first) — this restructure does not touch
  working instrumentation code from the in-flight branch.

## Part 3 — Environment management (dev / preprod / prod)

- **One `docker-compose.yml`**, prod-shaped: both `agent` and
  `mcp-server` use multi-stage Dockerfiles (`deps` → `dev` → `build` →
  `production` targets); the base file targets `production` (compiled
  `dist/`, no bind mounts, no watch). Preprod and prod use this file
  as-is.
- **One `docker-compose.override.yml`**, dev-only: targets each app's
  `dev` stage (`nest start --watch`), bind-mounts `apps/*/src` and
  `packages/instrumentation/src` over the image. Compose auto-merges
  this when present in the working directory and no `-f` is passed, so
  local dev stays a plain `docker compose up`; CI/preprod/prod never
  reference it.
- **One env file per tier, each self-contained:** `.env` (today's dev
  file, gitignored, unchanged name — plain `docker compose up` keeps
  working with zero flags), `.env.preprod`, `.env.production` (both
  gitignored). Each carries every variable every service needs (`DB_*`,
  `PHOENIX_*`, `INTERVALS_*`, `AGENT_PORT`, `MCP_PORT`, `OLLAMA_*`,
  `NODE_ENV`) — no cross-file merging.
- **Committed templates:** `.env.example` (already exists, becomes the
  canonical documented list of every variable across every service),
  plus new `.env.preprod.example` and `.env.production.example`.
- Preprod/prod are invoked explicitly: `docker compose --env-file
  .env.preprod up`, `docker compose --env-file .env.production up`.
- `mcp-server`'s `infrastructure.module.ts` currently hardcodes a
  relative lookup to the repo-root `.env` file — a dev-only convenience
  for running outside Docker. Since Compose's `env_file`/`environment`
  inject real process env vars before Node starts (avoiding the
  Phoenix-registration-order pitfall `.env.example` already documents,
  which only bites dotenv-based loading), this lookup is made tolerant
  of a missing file rather than deleted, so `pnpm --filter mcp-server
  start:dev` bare-metal still works.
- Root `package.json` gains `docker:preprod` and `docker:prod` scripts
  wrapping the `--env-file` invocations above. Dev needs no wrapper.

## Part 4 — Health, liveness, and Prometheus metrics

Both apps, same pattern:

- **`@nestjs/terminus`**: `GET /health/live` is a trivial handler (no
  dependency calls — that is what liveness means). `GET /health/ready`
  runs real indicators:
  - **mcp-server:** checks required config is present
    (`INTERVALS_API_KEY` set) — not a live call to intervals.icu,
    consistent with the lazy-validation design.
  - **agent:** checks it can reach mcp-server's `/health/live` and
    Ollama's base URL — the two dependencies it cannot function
    without.
- **`@willsoto/nestjs-prometheus`**: `PrometheusModule.register()`
  exposes `GET /metrics` in Prometheus text format with default Node
  process metrics (CPU, memory, event-loop lag, GC). No custom
  business metrics yet.
- **docker-compose healthchecks** for both services switch from the
  current hand-rolled `node -e fetch(...)` to hitting `/health/ready`.
  `agent`'s `depends_on: mcp-server` gains `condition:
  service_healthy`, so the agent container won't take traffic before
  mcp-server is actually reachable.

## Constraints

- Package manager stays pnpm; test runner stays Jest; TypeScript strict
  mode; `module`/`moduleResolution` stay `nodenext`; packages stay
  CommonJS.
- mcp-server's existing use-case/adapter/contract test suite must stay
  green throughout — it is the regression net for the transport change.
- No real secrets committed; every `.env*` file except the `*.example`
  ones stays gitignored.
- Moves use `git mv` so history follows the files.

## Testing strategy

- **mcp-server:** existing suite unchanged and green. New: an
  integration test that boots the real Nest app on an ephemeral port
  and drives it with the SDK's own `StreamableHTTPClientTransport` +
  `Client` (a real round-trip, not a mocked transport); `HealthController`
  specs (liveness always 200; readiness with `INTERVALS_API_KEY`
  present/absent); a smoke test that `/metrics` returns `text/plain`
  containing `process_` metrics.
- **agent:** unit tests for `Question`/`Answer` validation,
  `AskQuestionUseCase` (mocked `AgentInvokerPort`, asserting span
  attributes — relocated from the deleted `run.spec.ts`),
  `AgentController` (mocked use-case, 400 on non-string/empty
  question), `AskCommand` (mocked use-case). `LangGraphAgentAdapter`
  gets a thin orchestration test with `ChatOllama`/`MultiServerMCPClient`
  mocked as injected collaborators — a real run needs live Ollama +
  mcp-server, which belongs to manual verification, not CI.
- **Manual verification:** `pnpm turbo build && pnpm turbo test`, then
  `docker compose up --build` brings up db/phoenix/mcp-server/agent;
  `curl -X POST localhost:8787/invoke -d '{"question":"..."}'` returns
  an answer that round-tripped agent → HTTP → mcp-server →
  intervals.icu, with the trace visible in Phoenix; `curl
  localhost:3300/health/ready`, `localhost:8787/health/ready`, and both
  `/metrics` endpoints return real output.

## Migration & cleanup checklist

- Delete `apps/agent/src/{server.ts,run.ts,graph.ts}`.
- Remove `StdioServerTransport`/stdio import and the stdout-logger
  restriction from mcp-server's `main.ts`.
- Rewrite README.md's "Running" section: it currently describes
  pointing Claude Desktop/Code at the stdio binary, which becomes
  wrong. It needs to describe the Streamable HTTP endpoint instead —
  any existing local MCP client config pointing at the binary will need
  updating.
- Rewrite `docker-compose.yml`'s comment block ("The MCP server is
  intentionally absent... runs on the host") — now false.
- Rewrite both Dockerfiles as multi-stage (`deps` → `dev` → `build` →
  `production`); agent's is currently single-stage.
- New dependencies — agent: `@nestjs/{common,core,config,cli,terminus}`,
  `@willsoto/nestjs-prometheus`, `nest-commander`, `reflect-metadata`,
  `rxjs`, plus a `nest-cli.json`. mcp-server: `@nestjs/terminus`,
  `@willsoto/nestjs-prometheus`.
- Note in release/PR notes: this delivers the *transport* half of
  blueprint Phase 4 (Streamable HTTP) early, deliberately deferring
  Phase 4's Axis-A auth (OAuth resource server).

## Verification

- `pnpm turbo build` builds all workspace packages in dependency order.
- `pnpm turbo test` runs mcp-server, agent, and instrumentation suites,
  all green.
- `docker compose up --build` (dev, override auto-merged): db, phoenix,
  mcp-server, agent all come up; mcp-server and agent both report
  `service_healthy`.
- `curl -X POST localhost:8787/invoke -d '{"question":"hi"}'` returns an
  answer; the trace appears in Phoenix at localhost:6006 under both the
  `intervals-agent` and `intervals-icu-mcp` projects (agent's call plus
  the mcp-server tool call it triggers).
- `curl localhost:3300/health/ready`, `curl localhost:8787/health/ready`,
  `curl localhost:3300/metrics`, `curl localhost:8787/metrics` all
  return the expected output.
- Editing a file under `apps/mcp-server/src` or `apps/agent/src` while
  `docker compose up` is running reloads that service without a manual
  rebuild.
- `docker compose --env-file .env.preprod config` and `--env-file
  .env.production config` both render a valid, complete configuration
  with no dev bind-mounts (override file not applied).

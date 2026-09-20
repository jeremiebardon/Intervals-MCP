# intervals-icu-mcp

A pnpm + Turborepo monorepo containing an MCP server that exposes
intervals.icu training data, and a LangGraph agent app.

```
apps/mcp-server   NestJS MCP server, Streamable HTTP transport (hexagonal architecture)
apps/agent        NestJS LangGraph agent (hexagonal architecture), talks to mcp-server over HTTP
packages/instrumentation   shared Phoenix/OpenTelemetry bootstrap
packages/tsconfig          shared TypeScript base config
```

See `intervals-mcp-blueprint.md` for the full project plan,
`docs/superpowers/specs/2026-09-13-phase1-nestjs-hexagonal-design.md`
for the MCP server's Phase 1 design, and
`docs/superpowers/specs/2026-09-19-turborepo-langgraph-phoenix-design.md`
for the monorepo layout.

## Setup

1. `pnpm install`
2. Copy `.env.example` to `.env` and fill in `INTERVALS_API_KEY` from
   https://intervals.icu -> Settings -> Developer.
3. `pnpm build && pnpm test` to verify the whole workspace.

Per-package commands use pnpm filters, e.g.
`pnpm --filter @intervals/mcp-server test`.

Optionally run `pnpm --filter @intervals/mcp-server fixtures:record` to
pull your own real data from intervals.icu into
`apps/mcp-server/fixtures/recorded/` (gitignored, since it is your
personal health data). Contract tests run against the committed sample
fixtures under `apps/mcp-server/fixtures/*.json`; updating those
committed samples is a separate, deliberate, manual step (copy files
over after reviewing them) and is not what this script does.

## Running with Docker Compose

`docker compose up --build` starts four services, with hot reload for
`mcp-server` and `agent` (bind-mounted `src/`, `nest start --watch` —
see `docker-compose.override.yml`, which Compose applies automatically
whenever no `-f` flag is passed):

| Service | Where | What it is |
|---|---|---|
| `phoenix` | http://localhost:6006 | Arize Phoenix UI + OTLP collector (gRPC on 4317) |
| `db` | internal | Postgres backing Phoenix; traces survive restarts via the `phoenix_db` volume |
| `mcp-server` | http://localhost:3300/mcp | The MCP server, Streamable HTTP transport |
| `agent` | http://localhost:8787 | The LangGraph app. `POST /invoke` with `{"question": "..."}` |

Smoke test:

```bash
curl -s -X POST localhost:8787/invoke \
  -H 'content-type: application/json' \
  -d '{"question":"how is my form?"}'
```

The resulting `agent.invoke` span appears in Phoenix under the
`intervals-agent` project, and the `mcp-server` tool call it triggers
appears under `intervals-icu-mcp`.

Health and metrics, on both `mcp-server` (port 3300) and `agent` (port
8787): `GET /health/live`, `GET /health/ready`, `GET /metrics`
(Prometheus text format).

### Preprod and prod

`pnpm docker:preprod` / `pnpm docker:prod` start the same
`docker-compose.yml` against `.env.preprod` / `.env.production`
respectively, explicitly excluding the dev-only override (no bind
mounts, no watch mode — the `production` build target's compiled
`dist/`). Copy `.env.preprod.example` / `.env.production.example` to
`.env.preprod` / `.env.production` and fill in real values first;
neither file is committed.

## Running the MCP server outside Docker

`pnpm --filter @intervals/mcp-server start:dev` runs the MCP server
with hot reload, listening on `MCP_PORT` (default `3300`) at the
Streamable HTTP endpoint `/mcp`. Point any MCP client that supports
Streamable HTTP at `http://localhost:3300/mcp` to use the 7 tools:
`get_recent_activities`, `get_activity_detail`,
`get_activity_intervals`, `get_wellness_trend`, `get_planned_week`,
`get_training_load_summary`, `compare_periods`.

If you previously configured Claude Desktop/Code to spawn this server
over stdio, that configuration needs updating to point at the HTTP
endpoint instead — stdio transport has been removed.

For production use, `pnpm build` compiles to
`apps/mcp-server/dist/main.js`, and
`pnpm --filter @intervals/mcp-server start:prod` runs the compiled
server.

Note: `INTERVALS_API_KEY` is read lazily, only when a tool is first
invoked, not at server startup. This is deliberate (`ApiKeyCredentialProvider.getApiKey()`
is called on demand), so a missing/invalid key will not cause the
server to fail to start -- it will surface as an error on the first
tool call instead, and the `/health/ready` endpoint will report not
ready.

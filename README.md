# intervals-icu-mcp

A pnpm + Turborepo monorepo containing an MCP server that exposes
intervals.icu training data, and a LangGraph agent app.

```
apps/mcp-server   NestJS MCP server over stdio (hexagonal architecture)
apps/agent        LangGraph agent — boilerplate only, no LLM wired up yet
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

`docker compose up --build` starts three services:

| Service | Where | What it is |
|---|---|---|
| `phoenix` | http://localhost:6006 | Arize Phoenix UI + OTLP collector (gRPC on 4317) |
| `db` | internal | Postgres backing Phoenix; traces survive restarts via the `phoenix_db` volume |
| `agent` | http://localhost:8787 | The LangGraph app. `POST /invoke` with `{"question": "..."}` |

Smoke test:

```bash
curl -s -X POST localhost:8787/invoke \
  -H 'content-type: application/json' \
  -d '{"question":"how is my form?"}'
```

The resulting `agent.invoke` span appears in Phoenix under the
`intervals-agent` project.

**Why the MCP server is not a compose service.** It speaks stdio: its
client (Claude Desktop / Claude Code) spawns it as a subprocess, talks
to it over stdin/stdout, and kills it on exit. A long-lived container
with nothing attached to its stdin would idle forever, do no work, and
emit no traces while reporting as healthy. So it runs on the host, the
way its client expects, and traces into the *same* Phoenix through the
published port — set `PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006`
(the default) and its spans land under the `intervals-icu-mcp`
project, alongside the agent's.

## Running

`pnpm --filter @intervals/mcp-server start` runs the MCP server over
stdio. Point Claude Code's MCP config at this command to use the 6
tools: `get_recent_activities`, `get_activity_detail`,
`get_wellness_trend`, `get_planned_week`, `get_training_load_summary`,
`compare_periods`.

For production use, `pnpm build` compiles to
`apps/mcp-server/dist/main.js`, and
`pnpm --filter @intervals/mcp-server start:prod` runs the compiled
server.

Note: `INTERVALS_API_KEY` is read lazily, only when a tool is first
invoked, not at server startup. This is deliberate (`ApiKeyCredentialProvider.getApiKey()`
is called on demand), so a missing/invalid key will not cause the
server to fail to start -- it will surface as an error on the first
tool call instead.

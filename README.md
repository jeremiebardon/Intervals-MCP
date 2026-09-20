# intervals-icu-mcp

Ask questions about your [intervals.icu](https://intervals.icu) training
data in plain language. Two NestJS apps in a pnpm + Turborepo monorepo:

- **`apps/mcp-server`** — an MCP server that exposes 7 read-only tools over
  the MCP **Streamable HTTP** transport.
- **`apps/agent`** — a LangGraph agent (local Ollama model) that calls those
  tools over HTTP and answers your question.

Both are hexagonal (ports & adapters): `domain/` → `application/` (ports +
use cases) → `infrastructure/` (adapters), with HTTP/CLI/MCP as inbound adapters.

```
                  POST /invoke                  MCP over HTTP                    HTTPS
 you / curl / CLI ────────────▶  agent  ───────────────────────▶  mcp-server ───────────▶ intervals.icu
                                  │  :8787                          :3300/mcp
                                  ▼
                               Ollama (LLM, on your host, :11434)

 agent + mcp-server ── OpenTelemetry spans ──▶ Phoenix (UI :6006, OTLP :4317) ◀── Postgres
```

```
apps/mcp-server            MCP server (Streamable HTTP, stateless)
apps/agent                 LangGraph agent: HTTP API + CLI
packages/instrumentation   shared Phoenix / OpenTelemetry bootstrap
packages/tsconfig          shared TypeScript base config
```

## Prerequisites

| Need | Why |
|---|---|
| Node **24** and pnpm **12.4.1** (`npm i -g pnpm@12.4.1`) | matches the Docker images |
| Docker Desktop | the recommended way to run everything |
| [Ollama](https://ollama.com) running on the host, with a **tool-calling** model pulled | the agent's LLM. `ollama list` shows what you have |
| An intervals.icu API key | intervals.icu → Settings → Developer |

## Quick start (Docker, with hot reload)

```bash
pnpm install                       # once, for editor tooling and running tests
cp .env.example .env               # Windows PowerShell: Copy-Item .env.example .env
```

Edit `.env`:

- `INTERVALS_API_KEY` — your key (required).
- `OLLAMA_MODEL` — a model you have pulled that supports tool calling. If you
  have none: `ollama pull llama3.1`, then set `OLLAMA_MODEL=llama3.1`.
- Leave `MCP_SERVER_URL` and `OLLAMA_BASE_URL` alone for Docker (see
  [Environment](#environment) for why).

Start Ollama, then the stack:

```bash
docker compose up --build
```

`docker-compose.override.yml` is applied automatically (no `-f` flag): both
apps run `nest start --watch` with `src/` bind-mounted, so saving a file
reloads that service. The first build is slow; later starts are fast.

| Service | URL | What it is |
|---|---|---|
| `mcp-server` | http://localhost:3300/mcp | MCP endpoint (Streamable HTTP) |
| `agent` | http://localhost:8787 | `POST /invoke`, `/health/*`, `/metrics` |
| `phoenix` | http://localhost:6006 | trace UI + OTLP collector (gRPC :4317) |
| `db` | internal | Postgres for Phoenix (`phoenix_db` volume keeps traces) |

Startup order is enforced: `agent` waits for `mcp-server` to be **healthy**.
`mcp-server` is only healthy when `INTERVALS_API_KEY` is set.

## Testing the agent

Work top to bottom; each step proves one more link in the chain.

**1. Is everything up?**

```bash
curl localhost:3300/health/ready    # mcp-server: {"status":"ok",...}
curl localhost:8787/health/ready    # agent: 200 only if mcp-server AND Ollama are reachable
```

A `503` from the agent names the failing dependency
(`{"error":{"ollama":{"status":"down",...}}}`).

**2. Ask a question**

```bash
curl -s -X POST localhost:8787/invoke \
  -H 'content-type: application/json' \
  -d '{"question":"Summarise my last 5 activities"}'
# → {"answer":"..."}
```

PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8787/invoke `
  -ContentType 'application/json' -Body '{"question":"Summarise my last 5 activities"}'
```

Responses: `200 {"answer": "..."}`; `400` for an empty/missing `question`;
`500` when the agent itself fails — almost always Ollama unreachable or the
model missing/not tool-capable. Check `docker compose logs -f agent`.

**3. See what it did.** Open http://localhost:6006. Project
`intervals-agent` holds the `agent.invoke` span plus the LLM and tool-call
spans; project `intervals-icu-mcp` holds the MCP server's side of each tool call.

**4. Test the MCP server on its own** (no LLM involved). It is stateless, so
no handshake is needed:

```bash
curl -s -X POST localhost:3300/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Tools: `get_recent_activities`, `get_activity_detail`, `get_activity_intervals`,
`get_wellness_trend`, `get_planned_week`, `get_training_load_summary`,
`compare_periods`. Calling one (`"method":"tools/call"`) reads your real data.
To use them from Claude Code:
`claude mcp add --transport http intervals-icu http://localhost:3300/mcp`.
(Old stdio configs no longer work — stdio was removed.)

**5. CLI** (build first; needs mcp-server and Ollama reachable):

```bash
pnpm --filter @intervals/agent build
pnpm --filter @intervals/agent ask "how is my form?"
```

## Developing without Docker

Handy when you want a debugger or faster restarts. Run only the shared
infrastructure in Docker if you want traces (`docker compose up -d db phoenix`),
then in two terminals. The apps default to the Docker-internal URLs, so
override them inline:

```bash
# terminal 1 — reads INTERVALS_API_KEY from the repo-root .env
pnpm --filter @intervals/mcp-server start:dev

# terminal 2
MCP_SERVER_URL=http://localhost:3300/mcp OLLAMA_BASE_URL=http://localhost:11434 \
  pnpm --filter @intervals/agent start:dev
```

PowerShell:

```powershell
$env:MCP_SERVER_URL='http://localhost:3300/mcp'; $env:OLLAMA_BASE_URL='http://localhost:11434'
pnpm --filter @intervals/agent start:dev
```

Then use the same `curl` checks as above.

## Automated tests

```bash
pnpm build && pnpm test                       # whole workspace (turbo)
pnpm --filter @intervals/agent test           # one package (also: mcp-server, instrumentation)
pnpm lint                                     # eslint --fix
```

No Docker, Ollama or intervals.icu account is needed: agent tests mock
LangChain/LangGraph and terminus; mcp-server tests boot the real Nest app on
an ephemeral port and talk to it with the real MCP client, and run against
committed sample fixtures. Optional: `pnpm --filter @intervals/mcp-server
fixtures:record` pulls **your** data into `apps/mcp-server/fixtures/recorded/`
(gitignored — it is personal health data).

## Environment

One file per tier, all gitignored except the `*.example` templates:
`.env` (dev), `.env.preprod`, `.env.production`.

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `INTERVALS_API_KEY` | — | mcp-server | required for readiness; read lazily on first tool call |
| `INTERVALS_ATHLETE_ID` | `0` | mcp-server | `0` = the key's own athlete |
| `MCP_PORT` | `3300` | mcp-server | host port mapping in compose |
| `AGENT_PORT` | `8787` | agent | host port mapping in compose |
| `MCP_SERVER_URL` | `http://mcp-server:3300/mcp` | agent | compose hard-codes this for the container; only host runs read it |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | agent | Docker default. **Host runs need `http://localhost:11434`** |
| `OLLAMA_MODEL` | see `.env.example` | agent | must be pulled locally and support tool calling |
| `PHOENIX_COLLECTOR_ENDPOINT` | `http://localhost:6006` | both | compose sets `http://phoenix:6006` in containers |

Two things to know:

- `OLLAMA_*` in `.env` feed Docker Compose, so keep them Docker-flavoured and
  override inline for host runs (as above) rather than editing `.env`.
- `PHOENIX_COLLECTOR_ENDPOINT` is read when telemetry registers — before any
  `.env` file is loaded — so setting it in `.env` does nothing for host runs.
  Export it in your shell instead.

### Preprod and prod

`pnpm docker:preprod` / `pnpm docker:prod` run the same `docker-compose.yml`
against `.env.preprod` / `.env.production`, with the dev override excluded (no
bind mounts, compiled `production` image). Copy the matching `*.example`
file first and fill in real values.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `agent` never starts | `mcp-server` isn't healthy — usually `INTERVALS_API_KEY` is unset. `docker compose ps`, `docker compose logs mcp-server` |
| agent `/health/ready` is 503, `ollama: down` | Ollama isn't running, or unreachable from the container (`OLLAMA_BASE_URL`) |
| `/invoke` returns 500 | Ollama down, model not pulled, or model can't call tools — see agent logs |
| `ECONNREFUSED mcp-server:3300` on a host run | you forgot `MCP_SERVER_URL=http://localhost:3300/mcp` |
| no traces in Phoenix | Phoenix not running, or (host run) `PHOENIX_COLLECTOR_ENDPOINT` not exported in the shell |
| port already in use | change `MCP_PORT` / `AGENT_PORT` in `.env` (host side of the mapping) |
| edits don't hot-reload in Docker | file events sometimes don't cross a Windows bind mount; `docker compose restart agent` |

## Further reading

- `intervals-mcp-blueprint.md` — full project plan and phases
- `docs/superpowers/specs/2026-09-19-mcp-streamable-http-and-agent-hexagonal-design.md` — this transport/agent/compose design
- `docs/superpowers/specs/2026-09-13-phase1-nestjs-hexagonal-design.md` — MCP server hexagonal design
- `docs/superpowers/specs/2026-09-19-turborepo-langgraph-phoenix-design.md` — monorepo layout

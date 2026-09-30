# intervals-icu-mcp

Ask questions about your [intervals.icu](https://intervals.icu) training data
in plain language. A pnpm + Turborepo monorepo:

- **`apps/agents`** — a NestJS server running LangGraph graphs. The `coach`
  graph answers training questions: an analyst agent calls intervals.icu
  tools, then a coach writes the answer. Runs stream over **Server-Sent
  Events**; traces go to Arize Phoenix.
- **`apps/web`** — the Next.js client (mock data for now). Its app data will
  live in Supabase.

```
             POST /agents/coach/stream (SSE)               HTTPS
 web / curl ─────────────────────────────▶ agents :2024 ────────────▶ intervals.icu
                                            │
                                            ├─▶ Ollama (LLM, on your host, :11434)
                                            └─▶ Phoenix (traces, UI :6006) ◀── Postgres
```

```
apps/agents/src/
  config/                      env → typed config (@nestjs/config)
  infrastructure/
    llm/                       LlmProviderService: the ChatOllama model
    persistence/               CheckpointService: the graphs' checkpointer
    intervals/                 intervals.icu client, response schemas, mappers
    clock/                     injectable clock
  tools/                       one file per tool: logic + zod schema;
                               TrainingToolsService binds them to Nest providers
  graphs/coach/
    state.ts                   graph state (Annotation.Root)
    nodes/                     AnalystNode (tools), CoachNode (answer)
    coach.graph.ts             CoachGraphService: builds and compiles the graph
    prompts/                   system prompts
  api/                         SSE controller, AgentService (threads, streaming), DTOs
  lib/                         date ranges, weeks, pace maths
```

## Prerequisites

| Need | Why |
|---|---|
| Node **24** and pnpm **12.4.1** (`npm i -g pnpm@12.4.1`) | matches the Docker image |
| [Ollama](https://ollama.com) on the host, with a **tool-calling** model pulled | the agents' LLM. `ollama list` shows what you have |
| An intervals.icu API key | intervals.icu → Settings → Developer |
| Docker Desktop (optional) | Phoenix, or the whole stack |

## Quick start

```bash
pnpm install
cp .env.example .env               # PowerShell: Copy-Item .env.example .env
```

Set `INTERVALS_API_KEY` and an `OLLAMA_MODEL` you have pulled. For a host run,
set `OLLAMA_BASE_URL=http://localhost:11434` if `host.docker.internal` does not
resolve on your machine.

```bash
docker compose up -d db phoenix     # optional: traces at http://localhost:6006
pnpm --filter @intervals/agents start:dev
```

The server (`nest start --watch`) listens on http://localhost:2024 and
restarts on save. It loads the repo-root `.env` itself. `pnpm build` then
`pnpm start` runs the compiled `dist/`.

Or run everything in Docker: `docker compose up --build` (agents, Phoenix,
Postgres; `src/` is bind-mounted and hot-reloads).

## Asking a question

```bash
curl -N -X POST localhost:2024/agents/coach/stream \
  -H 'content-type: application/json' \
  -d '{"input":"How far did I run this week?"}'
```

Events, in order:

| `event:` | `data:` |
|---|---|
| `thread` | `{"type":"thread","threadId":"…"}`: always first |
| `tool` | `{"type":"tool","name":"get_recent_activities"}`: an analyst tool call |
| `token` | `{"type":"token","content":"…"}`: a piece of the coach's answer |
| `end` | `{"type":"end"}`: then the stream closes |
| `error` | the error message, instead of `end` |

To continue a conversation, send the `threadId` back with the next question
(`{"input":"…","threadId":"…"}`); the thread keeps its `messages` history. A
run is capped at 25 graph steps, and closing the connection aborts it.

## Tools

`get_recent_activities`, `get_activity_detail`, `get_activity_intervals`,
`get_wellness_trend`, `get_planned_week`, `get_training_load_summary`,
`compare_periods`, `get_weekly_totals`, `calculate_race_pace`.

Each lives in `apps/agents/src/tools/<name>.ts` as a plain function
`(deps, input)` plus a `defineTool(...)` wrapper with its zod schema. Tool
errors go back to the model as `{code, message}` so it can retry. To add one:
write the file, then list it in `tools/index.ts`. `TrainingToolsService`
injects the intervals.icu client and clock, so tools need no Nest code.

## Tracing

Every run, model call and tool call is traced to Phoenix (project
`intervals-agent`) via OpenInference's LangChain instrumentation
(`src/instrumentation.ts`). Set `PHOENIX_COLLECTOR_ENDPOINT` (default
`http://localhost:6006`); if Phoenix is down, runs still work.

## Tests

```bash
pnpm test                                  # whole workspace
pnpm typecheck
pnpm --filter @intervals/agents test
pnpm lint
```

No Ollama or intervals.icu account needed: tools are tested with a fake
client, the client with a mocked `fetch`, and the response schemas against
committed fixtures. `pnpm --filter @intervals/agents fixtures:record` pulls
**your** data into `apps/agents/fixtures/recorded/` (gitignored: personal
health data).

## Environment

| Variable | Default | Notes |
|---|---|---|
| `INTERVALS_API_KEY` | — | required; the server fails to start without it |
| `INTERVALS_ATHLETE_ID` | `0` | `0` = the key's own athlete |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | compose uses `http://host.docker.internal:11434` |
| `OLLAMA_MODEL` | `gemma4:12b` | must be pulled and support tool calling |
| `PHOENIX_COLLECTOR_ENDPOINT` | `http://localhost:6006` | compose sets `http://phoenix:6006` |
| `AGENTS_PORT` | `2024` | host port in compose |
| `PORT` | `2024` | port the server listens on |

`pnpm docker:preprod` / `pnpm docker:prod` run `docker-compose.yml` against
`.env.preprod` / `.env.production` (copy the `*.example` files first).

**Note:** threads are checkpointed in memory (`MemorySaver`) and lost when the
server restarts. To persist them, swap in `PostgresSaver`
(`@langchain/langgraph-checkpoint-postgres`) against Supabase in
`infrastructure/persistence/checkpoint.service.ts`; nothing else changes.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `error` event `fetch failed` | Ollama not running or `OLLAMA_BASE_URL` unreachable |
| server exits on start, `INTERVALS_API_KEY is not set` | fill in `.env` |
| a tool returns `UPSTREAM_CONTRACT_MISMATCH` | intervals.icu changed a response shape; update `infrastructure/intervals/schemas.ts` |
| no traces in Phoenix | Phoenix not running, or wrong `PHOENIX_COLLECTOR_ENDPOINT` |

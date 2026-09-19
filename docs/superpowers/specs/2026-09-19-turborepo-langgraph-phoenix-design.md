# Turborepo + LangGraph Agent + Phoenix Compose — Design

Status: approved
Date: 2026-09-19
Scope: repository restructure, one new app (boilerplate only), local
orchestration. See `intervals-mcp-blueprint.md` for the wider project.

## Goal

Three things, in one restructure:

1. Turn the single-package repo into a **Turborepo + pnpm workspaces**
   monorepo, so more than one runnable app can share code.
2. Extract the Phoenix/OpenTelemetry bootstrap into a **shared
   `@intervals/instrumentation` package** consumed by every app — the
   worked example of "shared service" that proves the seam is real.
3. Add **`@intervals/agent`**, a LangGraph app containing *boilerplate
   only*: a compiled graph with one node, an HTTP entry point, and a
   test. No LLM calls, no MCP client wiring, no real agent logic.

Plus a **`docker-compose.yml`** that brings up Arize Phoenix and the
agent, giving both apps one shared Phoenix instance to trace into —
the agent from inside the compose network, the MCP server from the
host over the published port.

## Non-goals

Explicitly out of scope — do not build these:

- Any real agent behaviour: no LLM provider, no prompts, no tool
  calling, no memory/checkpointer, no human-in-the-loop.
- Wiring the agent to the MCP server (via `langchain-mcp-adapters` or
  otherwise). The two apps ship independently in this change.
- An MCP wrapper that lets Claude Desktop trigger the agent.
- `@arizeai/openinference-instrumentation-langchain`. The agent gets
  traced via a manual span around the graph run. LangChain
  auto-instrumentation lands when the agent makes real LLM calls.
- `redact()` for span attributes (blueprint §5). It belongs in
  `@intervals/instrumentation` and is the reason that package exists
  rather than an inlined helper, but it is not written here.
- A production Docker image. The agent's Dockerfile is a dev-loop
  image: it copies the whole workspace and builds inside the container.
- An image for the MCP server — see "The MCP server is not a compose
  service" below.

## Target layout

```
intervals-icu-mcp/                    # workspace root
├── package.json                      # private root; scripts delegate to turbo
├── pnpm-workspace.yaml               # packages: apps/*, packages/*
├── turbo.json
├── eslint.config.mjs                 # stays at root, covers all workspaces
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── docs/                             # unchanged
├── intervals-mcp-blueprint.md        # unchanged
│
├── apps/
│   ├── mcp-server/                   # everything the repo is today
│   │   ├── package.json              # @intervals/mcp-server
│   │   ├── tsconfig.json             # extends @intervals/tsconfig/base.json
│   │   ├── tsconfig.build.json
│   │   ├── nest-cli.json
│   │   ├── src/ test/ fixtures/ scripts/
│   │
│   └── agent/                        # NEW — boilerplate only
│       ├── package.json              # @intervals/agent
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── src/
│           ├── instrumentation.ts    # calls shared registerTelemetry
│           ├── graph.ts              # StateGraph, one node
│           ├── run.ts                # instrumented runAgent()
│           ├── server.ts             # node:http /invoke + /health
│           ├── main.ts               # entry point
│           └── __tests__/
│               ├── graph.spec.ts
│               └── run.spec.ts
│
└── packages/
    ├── instrumentation/              # NEW — @intervals/instrumentation
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/index.ts + __tests__/
    └── tsconfig/                     # NEW — @intervals/tsconfig
        ├── package.json
        └── base.json
```

## Decisions and rationale

### LangGraph in TypeScript, not Python

`@langchain/langgraph` (JS, 1.4.x) rather than the Python package. The
whole point of the monorepo is sharing `@intervals/instrumentation`,
the tsconfig base, and one turbo pipeline. A Python app shares none of
that and forces a second toolchain into the repo and into CI.

### The shared package is the telemetry *bootstrap*, not the whole telemetry story

`@intervals/instrumentation` exports one function,
`registerTelemetry({ projectName })`, which wraps
`@arizeai/phoenix-otel`'s `register`. What stays app-local is which
*instrumentations* to enable: the MCP server enables
`MCPInstrumentation`, the agent enables nothing yet. That is the
correct seam — the Phoenix connection is common, the patched libraries
are not.

The package deliberately does not re-export OTel types. Apps that need
spans import `@opentelemetry/api` directly.

### Ordering constraint survives the move

`register()` must run before `@modelcontextprotocol/sdk` is imported,
or `MCPInstrumentation` has nothing to patch. So
`apps/mcp-server/src/instrumentation.ts` stays the first import in
`main.ts`; it just delegates its first line to the shared package
instead of calling `register` itself.

### Jest resolves workspace packages from source

Each app's Jest config maps `@intervals/instrumentation` to the
package's `src/index.ts` via `moduleNameMapper`. Without this, running
tests would require building `packages/instrumentation` first, which
makes the red-green loop slow and the failure mode confusing. `tsc`
builds still resolve through the built `dist` via the package's
`main`/`types`.

### Dev dependencies are duplicated per workspace

pnpm does not hoist the root's dev dependencies into each package's
`node_modules/.bin`, so `pnpm --filter X test` cannot find a root-level
`jest`. Each workspace package declares the tooling it actually runs.
The root keeps only what the root itself runs: `turbo`, `eslint` and
its plugins, `prettier`, `typescript`.

### One shared tsconfig base, no variants

`@intervals/tsconfig/base.json` is today's root `tsconfig.json` minus
`baseUrl` and `outDir`. Both are dropped because TypeScript resolves
them relative to the file that *declares* them — left in the base they
would point inside `packages/tsconfig/`. Each app sets its own
`outDir` and `rootDir`. Decorator options stay in the base even though
only the Nest app needs them; a second variant is not worth the file.

### The MCP server is not a compose service

A stdio MCP server's lifecycle belongs to its client: Claude Desktop /
Claude Code spawns it as a subprocess, writes to its stdin, and kills
it on exit. Running it as a long-lived container is a category error —
with nothing attached to its stdin it would idle forever, do no work
and emit no traces, while looking like a running service.

So Compose runs the *infrastructure* plus the one app that is a real
server:

- `db` + `phoenix` — shared backing services
- `agent` — a genuine HTTP server; `POST /invoke` runs the graph

The MCP server keeps running on the host, spawned by its client, and
reaches Phoenix over the published port with
`PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006`. Its spans land in
the same Phoenix instance as the agent's, which is the thing that
actually mattered about "running them together".

Consequently there is **no `apps/mcp-server/Dockerfile`**. An image for
it only becomes meaningful at blueprint Phase 4, when the server grows
a streamable-HTTP transport and becomes a real network service.

### Phoenix runs with Postgres

Per the Arize self-hosting docs: `arizephoenix/phoenix:latest`, port
6006 (UI + OTLP HTTP), 4317 (OTLP gRPC), backed by a `postgres`
service via `PHOENIX_SQL_DATABASE_URL`, with a named volume so traces
survive a restart.

`@arizeai/phoenix-otel` reads `PHOENIX_COLLECTOR_ENDPOINT` and
otherwise defaults to `localhost:6006`. The agent container therefore
sets it to `http://phoenix:6006` (service name on the compose
network); the host-run MCP server needs `http://localhost:6006`, which
is the default, so it works with the variable unset.

## Constraints

- Package manager stays pnpm; test runner stays Jest.
- TypeScript strict mode everywhere; `module`/`moduleResolution` stay
  `nodenext`; packages stay CommonJS (no `"type": "module"`).
- `@modelcontextprotocol/sdk` types stay inside
  `apps/mcp-server/src/mcp/`.
- Moves use `git mv` so history follows the files.
- The existing MCP server test suite must stay green through every
  task — it is the regression net for the restructure.
- No real secrets committed; `.env` stays gitignored.

## Verification

- `pnpm turbo build` builds all three workspace packages in dependency
  order.
- `pnpm turbo test` runs the MCP server suite plus the new agent and
  instrumentation suites, all green.
- `docker compose up --build` brings up db, phoenix and agent;
  `curl -X POST localhost:8787/invoke -d '{"question":"hi"}'` returns an
  answer and the trace appears in the Phoenix UI at localhost:6006
  under the `intervals-agent` project.
- With that stack up, starting the MCP server on the host
  (`pnpm --filter @intervals/mcp-server start:prod`) and exercising a
  tool puts its spans in the same Phoenix instance under the
  `intervals-icu-mcp` project.

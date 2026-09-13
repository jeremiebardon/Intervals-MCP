# Phase 1 Design — NestJS Hexagonal Scaffold for intervals-icu-mcp

Status: approved
Date: 2026-09-13
Scope: Phase 1 only (see `intervals-mcp-blueprint.md` §2 for later phases)

## Goal

Stand up a local, stdio-only MCP server exposing intervals.icu training
data to Claude Code, built with NestJS as the DI container in a
hexagonal (ports & adapters) layout. Deliverable: querying real
training data from Claude Code via 6 well-designed tools, backed by
recorded HTTP fixtures and contract tests.

## Module layout

```
intervals-icu-mcp/
├── src/
│   ├── domain/                         # plain TS, zero deps, zero Nest decorators
│   │   ├── activity.ts                 # Activity, ActivityId, TrainingLoad
│   │   ├── wellness.ts                 # Wellness, HRV, RestingHR
│   │   ├── planned-workout.ts
│   │   └── date-range.ts               # value object; validates start <= end
│   │
│   ├── application/
│   │   ├── ports/
│   │   │   ├── intervals.port.ts       # abstract class = DI token + interface
│   │   │   └── clock.port.ts           # testable now()
│   │   ├── use-cases/
│   │   │   ├── get-recent-activities.use-case.ts
│   │   │   ├── get-activity-detail.use-case.ts
│   │   │   ├── get-wellness-trend.use-case.ts
│   │   │   ├── get-planned-week.use-case.ts
│   │   │   ├── get-training-load-summary.use-case.ts
│   │   │   └── compare-periods.use-case.ts
│   │   └── application.module.ts
│   │
│   ├── infrastructure/
│   │   ├── intervals/
│   │   │   ├── intervals-http.adapter.ts   # implements IntervalsPort
│   │   │   ├── schemas.ts                  # zod for every upstream response
│   │   │   └── mappers.ts                  # API shape -> domain entity
│   │   ├── auth/
│   │   │   └── api-key.credential-provider.ts
│   │   ├── clock/
│   │   │   └── system-clock.adapter.ts
│   │   └── infrastructure.module.ts        # binds concrete adapters to port tokens
│   │
│   ├── mcp/                            # INBOUND adapter
│   │   ├── tools/
│   │   │   ├── recent-activities.tool.ts
│   │   │   ├── activity-detail.tool.ts
│   │   │   ├── wellness-trend.tool.ts
│   │   │   ├── planned-week.tool.ts
│   │   │   ├── training-load-summary.tool.ts
│   │   │   └── compare-periods.tool.ts
│   │   ├── with-tool-span.ts           # no-op passthrough in Phase 1; Phase 2 fills in OTel
│   │   ├── errors.ts                   # domain error -> MCP error mapping
│   │   ├── server.ts                   # builds McpServer, registers tools, connects StdioServerTransport
│   │   └── mcp.module.ts
│   │
│   ├── app.module.ts                   # composition root
│   └── main.ts                         # NestFactory.createApplicationContext(AppModule); boots mcp/server.ts
│
├── fixtures/                           # recorded intervals.icu responses (gitignored contents, dir kept)
├── scripts/
│   └── record-fixtures.ts              # one-off script; hits real API with your key, saves JSON
├── test/                               # contract tests: fixtures -> zod -> mapper assertions
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## Dependency injection

- Ports (`intervals.port.ts`, `clock.port.ts`) are **abstract classes**.
  Nest uses the class itself as the injection token, so `application/`
  and `domain/` stay pure TypeScript interfaces with no Nest import,
  while `infrastructure/infrastructure.module.ts` provides the binding:

  ```ts
  { provide: IntervalsPort, useClass: IntervalsHttpAdapter }
  ```

- `application.module.ts` declares the six use-cases as providers and
  exports them.
- `infrastructure.module.ts` declares adapters (`IntervalsHttpAdapter`,
  `ApiKeyCredentialProvider`, `SystemClockAdapter`) as providers bound
  to their port tokens, imports `ConfigModule` for env access, and
  exports the port tokens.
- `mcp.module.ts` declares the six tool classes as providers, each
  injecting its corresponding use-case.
- `app.module.ts` imports `ApplicationModule`, `InfrastructureModule`,
  `McpModule` — the composition root, same role as blueprint's
  `composition-root.ts` but expressed as Nest module wiring instead of
  hand-rolled code.

## MCP boot sequence

`main.ts`:
1. `NestFactory.createApplicationContext(AppModule)` — no HTTP listener.
2. Resolve the 6 tool providers from the context.
3. Build an `@modelcontextprotocol/sdk` `McpServer`, register each tool
   (name, zod input schema, description, handler wrapped by
   `withToolSpan`).
4. Connect `StdioServerTransport`.

Nest never imports anything from `@modelcontextprotocol/sdk` outside
`src/mcp/` — isolates transport/spec churn to one directory per the
blueprint's risk mitigation (§8).

## Tool design

Each tool class in `mcp/tools/`:
- Is `@Injectable()`, constructor-injects its use-case.
- Exposes `name`, `description` (states when *not* to use it, per
  blueprint §4 rule 4), zod input schema, and an `execute(input)`
  method.
- Output is capped and shaped by the use-case (blueprint §4 rules 1–3):
  compact fields only, `{ truncated, shown, total, hint }` on overflow.
- `execute` is wrapped by `withToolSpan(toolName, handler)`. Phase 1
  implementation is a plain passthrough (`return handler(input)`) —
  the wrapper exists so Phase 2 adds tracing without touching tool
  code.

All 6 starter tools from blueprint §4 are built in Phase 1:
`get_recent_activities`, `get_activity_detail`, `get_wellness_trend`,
`get_planned_week`, `get_training_load_summary`, `compare_periods`.

## Auth (Axis B only — Phase 1)

- `ApiKeyCredentialProvider` (infrastructure/auth) reads
  `INTERVALS_API_KEY` (required) and `INTERVALS_ATHLETE_ID` (default
  `"0"`) via Nest `ConfigModule`.
- `IntervalsHttpAdapter` uses HTTP Basic auth: username literal
  `API_KEY`, password = the key value, per intervals.icu's documented
  scheme, on all requests to `https://intervals.icu/api/v1/...`.
- `.env.example` documents both vars; `.env` is gitignored. No key is
  committed. The record-fixtures script and the app itself both read
  from `.env` — user fills it in locally after scaffolding.

## Fixtures & contract tests

- `scripts/record-fixtures.ts`: standalone Node/ts-node script (not
  part of the Nest app), reads `.env`, calls the real intervals.icu
  API for each endpoint the adapter needs, writes raw JSON responses
  under `fixtures/<endpoint>.json`. Run manually once a real
  `.env` is in place.
- `test/` contract tests load those fixture files, run them through
  `infrastructure/intervals/schemas.ts` (zod) and `mappers.ts`, and
  assert the resulting domain objects. These are deterministic and
  fast — no network calls in the test suite itself.
- Separately, unit tests for use-cases inject a fake `IntervalsPort`
  (no fixtures needed) to test business logic like
  `get-training-load-summary`'s CTL/ATL/TSB computation and
  `compare-periods`'s delta math.

## Tooling

- Package manager: pnpm.
- Test runner: Jest (Nest CLI default).
- Scaffolded via `@nestjs/cli` (`nest new`), then restructured into the
  hexagonal layout above.
- TypeScript strict mode on.

## Out of scope for Phase 1

(Deferred to later phases per blueprint §2 — not built now)
- OpenTelemetry wiring (Phase 2) — only the `withToolSpan` seam exists.
- Evals harness (Phase 3).
- Streamable HTTP transport, OAuth 2.1 resource server, intervals.icu
  OAuth (Phase 4) — Phase 1 is stdio + API key only.
- Write tools (`:WRITE` scopes) — read-only per blueprint §4 rule 6.

## Testing plan for this phase

- `pnpm test` runs unit tests (use-cases w/ fakes) and contract tests
  (fixtures → schema → mapper) — both must pass in CI-equivalent local
  run before calling Phase 1 done.
- Manual smoke test: run `mcp/server.ts` over stdio, connect from
  Claude Code, invoke each of the 6 tools against real data at least
  once.

# intervals-mcp — Project Blueprint

An MCP server exposing intervals.icu training data to Claude Code (and any other MCP host).
Built in TypeScript, hexagonal architecture, with OpenTelemetry observability and a real eval harness.

---

## 0. Verdict: is this a good project?

Yes, for four reasons:

1. **You'll actually use it.** A portfolio project you run daily gets iterated on. One you build for a README rots.
2. **It hits the most in-demand 2026 pattern.** MCP + tool integration is the architecture hiring managers are screening for, and almost nobody's public examples include auth, telemetry, or evals.
3. **The data is genuinely agent-shaped.** Training data is time-series, multi-entity, and too large to dump into context — which forces you to solve the *real* AI-engineering problems (tool granularity, token budgets, summarisation before return) rather than writing a thin API wrapper.
4. **It maps onto skills you already have.** NestJS DI, ports/adapters, typed contracts. The MCP layer is just another inbound adapter.

**What would make it a bad project:** stopping at "10 tools that proxy 10 REST endpoints." That's a wrapper, not an AI engineering artefact. The observability and eval layers are what turn it into one.

---

## 1. The two auth axes (get this straight before writing code)

| Axis | Who authenticates | Options |
|---|---|---|
| **A. MCP client → your server** | The *user of your MCP server* | None (stdio, local) → OAuth 2.1 with Auth0/WorkOS/Keycloak as authorization server |
| **B. Your server → intervals.icu** | *You*, or the end user, to intervals.icu | Personal API key (basic auth) → intervals.icu OAuth2 |

**Analogy:** Axis A is the front-desk key card that lets someone into the hotel. Axis B is the key to your room's safe. They're issued by different parties and solve different problems. Most tutorials only cover one and imply it's both.

For Claude Code on your laptop over stdio, Axis A is *nothing* and Axis B is *an API key in an env var*. That's not a shortcut, it's the correct design for that deployment.

### intervals.icu specifics (Axis B, OAuth version)

```
GET  https://intervals.icu/oauth/authorize?client_id=...&redirect_uri=...&scope=...&state=...
POST https://intervals.icu/api/oauth/token   (form: client_id, client_secret, code)
     -> { token_type, access_token, scope, athlete: { id, name } }
DELETE https://intervals.icu/api/v1/disconnect-app   (revoke)
```

- Scopes: `ACTIVITY`, `WELLNESS`, `CALENDAR`, `CHATS`, `LIBRARY`, `SETTINGS`, each `:READ` or `:WRITE`.
  Example: `ACTIVITY:READ,WELLNESS:READ,CALENDAR:READ`
- **Code expires in 2 minutes.**
- **No refresh tokens.** A new authorisation replaces the previous token. Your token store needs a re-auth path, not a refresh path.
- **The app must be approved by intervals.icu before the flow works at all.** Apply early at `https://intervals.icu/oauth/apply` — this is a human-in-the-loop dependency you cannot unblock yourself.
- `athlete_id = "0"` resolves to the bearer token's athlete. Use it everywhere; it removes an entire class of bug.

### MCP spec side (Axis A)

If you go remote, your server is an **OAuth 2.1 resource server**: it validates tokens, it does not mint them. The flow the client runs on its own: unauthenticated request → `401` with `WWW-Authenticate` pointing at RFC 9728 protected-resource metadata → that names the authorization server → RFC 8414 discovery → auth code + PKCE + RFC 8707 `resource` parameter → your server validates the token *audience is itself* (this is what stops a token minted for another server being replayed against yours).

Auth0 slots in as the authorization server here. Budget days, not hours — and note most of that time is the authorization server config, not the MCP part.

⚠️ **Pin your spec revision.** The `2026-07-28` revision was the largest change since launch: the `initialize`/`initialized` handshake and `Mcp-Session-Id` header are gone, each request carries protocol version and client identity in `_meta`, and protocol-level logging is deprecated in favour of OpenTelemetry. Any tutorial describing sessions or custom MCP log levels predates this. Check the spec before copying auth code from anywhere, including this document.

---

## 2. Phased plan

### Phase 1 — Local, useful, this week (~1 weekend)
- stdio transport, `@modelcontextprotocol/sdk`
- Axis B = personal API key from env
- 4–6 well-designed tools
- Zod schemas on every input and every upstream response
- Recorded HTTP fixtures + contract tests
- **Deliverable:** you're querying your own training data from Claude Code.

### Phase 2 — Observability (~2–3 days)
- OTel SDK, span per tool call, span per upstream HTTP call
- Local Jaeger or Arize Phoenix to view traces
- **Deliverable:** you can answer "why was that tool call slow / empty / wrong?"

### Phase 3 — Evals (~4–5 days, the part that differentiates you)
- Golden dataset of real questions → expected tool trajectory
- Trajectory assertions + LLM-as-judge groundedness
- Token-budget regression gate
- CI on PR
- **Deliverable:** a README section with an eval table and honest failure analysis.

### Phase 4 — Remote + OAuth (optional, ~1 week + approval wait)
- Streamable HTTP transport
- Axis A: OAuth 2.1 resource server (Auth0)
- Axis B: intervals.icu OAuth, per-user token store, re-auth path
- Deploy somewhere with a public URL.

> Streamable HTTP transport itself shipped early (see
> `docs/superpowers/specs/2026-09-19-mcp-streamable-http-and-agent-hexagonal-design.md`),
> running inside the docker-compose network / localhost only. Axis A/B
> auth and a public deployment remain open, as originally scoped here.

Phases 1–3 already make a stronger portfolio piece than most Phase 4 projects that skip evals.

---

## 3. Repo structure (hexagonal)

The pattern you already use, with one insight: **the MCP server is an inbound adapter, exactly like a REST controller.** Tools are your inbound ports' delivery mechanism. This is why hexagonal pays off immediately here — the same use case can be reached from an MCP tool, a CLI, or an HTTP endpoint in your eval harness, with zero duplication.

```
intervals-mcp/
├── src/
│   ├── domain/                       # pure, no deps
│   │   ├── activity.ts               # Activity, ActivityId, TrainingLoad
│   │   ├── wellness.ts               # Wellness, HRV, RestingHR
│   │   ├── planned-workout.ts
│   │   └── date-range.ts             # value object; validates start <= end
│   │
│   ├── application/
│   │   ├── ports/
│   │   │   ├── intervals.port.ts     # outbound: what the domain needs
│   │   │   ├── clock.port.ts         # outbound: "last 7 days" needs a testable now()
│   │   │   └── telemetry.port.ts     # outbound: span/counter, no OTel types leak in
│   │   └── use-cases/
│   │       ├── get-recent-activities.use-case.ts
│   │       ├── get-wellness-trend.use-case.ts
│   │       ├── get-planned-week.use-case.ts
│   │       ├── summarise-training-load.use-case.ts
│   │       └── get-activity-detail.use-case.ts
│   │
│   ├── infrastructure/
│   │   ├── intervals/
│   │   │   ├── intervals-http.adapter.ts    # implements IntervalsPort
│   │   │   ├── schemas.ts                   # zod for every upstream response
│   │   │   └── mappers.ts                   # API shape -> domain entity
│   │   ├── auth/
│   │   │   ├── credential.port.ts
│   │   │   ├── api-key.credential-provider.ts   # Phase 1
│   │   │   └── oauth.credential-provider.ts     # Phase 4
│   │   └── telemetry/
│   │       └── otel-telemetry.adapter.ts
│   │
│   ├── mcp/                          # INBOUND adapter
│   │   ├── tools/
│   │   │   ├── recent-activities.tool.ts
│   │   │   └── ...
│   │   ├── with-tool-span.ts         # decorator wrapping every tool handler
│   │   ├── errors.ts                 # domain error -> MCP error mapping
│   │   ├── mcp.controller.ts         # POST/GET/DELETE /mcp (Streamable HTTP)
│   │   └── mcp-transport.service.ts  # per-session Streamable HTTP transport
│   │
│   └── composition-root.ts           # wire adapters to ports (your DI, hand-rolled)
│
├── evals/
│   ├── dataset/golden.jsonl
│   ├── runner.ts
│   ├── judges/groundedness.ts
│   └── report.ts
├── fixtures/                         # recorded intervals.icu responses
└── test/
```

**Why `telemetry.port.ts` rather than importing OTel in the use case:** same reason you don't import Stripe in a domain service. It also means your eval runner can inject a recording telemetry adapter and assert on the trajectory without a collector running.

---

## 4. Tool design — this is the actual AI engineering

An LLM's context is the scarce resource. Design tools like you'd design a mobile API over a bad network: the round trip is cheap, the payload is not.

**Analogy:** a REST API is a library where you can request any book. An MCP tool set is a librarian talking to someone who can only hold five books at once. The librarian's job isn't to fetch everything — it's to fetch the right thing, already summarised.

### Rules

1. **One tool per *question*, not per endpoint.** `get_training_load_summary(weeks: 6)` beats `list_activities(limit: 500)`.
2. **Never return raw API payloads.** An intervals.icu activity has 100+ fields. Return 8. Add a `get_activity_detail(id)` for drill-down.
3. **Hard-cap every response.** Set a max token budget per tool (e.g. 2k). If exceeded, truncate and say so *in the payload*: `{ truncated: true, shown: 20, total: 340, hint: "narrow the date range" }`. Silent truncation is how agents hallucinate.
4. **Descriptions are prompts.** The tool description is the only thing the model reads when deciding. Say when *not* to use it: `"Use for trends over weeks. For a single session, use get_activity_detail."`
5. **Absolute dates in, relative dates resolved inside.** Accept `{ from, to }` ISO dates; add a `resolve_date_range` helper or put "today is X" in the server instructions. Models are unreliable at date arithmetic.
6. **Read-only until evals are green.** `ACTIVITY:READ,WELLNESS:READ,CALENDAR:READ`. Adding `:WRITE` (creating planned workouts) is a great Phase 5 — but write tools need confirmation semantics and a much stricter eval suite.

### Starter tool set

| Tool | Input | Returns |
|---|---|---|
| `get_recent_activities` | `{ from, to, sport?, limit? }` | Compact list: date, name, distance, duration, avg HR, pace, load |
| `get_activity_detail` | `{ activityId }` | Full session incl. intervals/laps, zones distribution |
| `get_wellness_trend` | `{ from, to, metrics[] }` | Daily series: HRV, resting HR, sleep, weight, fatigue |
| `get_planned_week` | `{ weekStart? }` | Planned workouts from the calendar |
| `get_training_load_summary` | `{ weeks }` | CTL/ATL/TSB (fitness/fatigue/form) rollup + weekly volume |
| `compare_periods` | `{ periodA, periodB }` | Deltas in volume, load, pace, HR |

`get_training_load_summary` and `compare_periods` are the interesting ones: they compute in your use case layer instead of shipping raw rows to the model. **That computation-vs-context tradeoff is the single most transferable lesson in this project.**

---

## 5. Observability

MCP servers ship with no built-in observability — tool-call latency, errors, and baselines are invisible by default. And with the 2026-07-28 revision deprecating protocol-level logging in favour of OpenTelemetry, OTel isn't a nice-to-have anymore; it's the sanctioned path.

An MCP server is just a Node process, so instrumentation is roughly one `--import` flag away.

### Wire-up

```bash
npm i @opentelemetry/sdk-node @opentelemetry/api \
      @opentelemetry/auto-instrumentations-node \
      @opentelemetry/exporter-trace-otlp-http
```

Backend for local dev: **Jaeger** in Docker (simplest) or **Arize Phoenix** (OTel-native, and it also does evals, so it doubles up for section 6).

### The wrapper pattern

Every tool handler goes through one decorator. Don't scatter `startSpan` calls.

```ts
// src/mcp/with-tool-span.ts
export const withToolSpan = <I, O>(
  toolName: string,
  handler: (input: I) => Promise<O>,
) => async (input: I): Promise<O> => {
  return tracer.startActiveSpan(`mcp.tool/${toolName}`, async (span) => {
    span.setAttributes({
      'mcp.tool.name': toolName,
      'mcp.tool.arguments': redact(JSON.stringify(input)),
    });
    const t0 = performance.now();
    try {
      const result = await handler(input);
      const payload = JSON.stringify(result);
      span.setAttributes({
        'mcp.tool.result.bytes': payload.length,
        'mcp.tool.result.est_tokens': Math.ceil(payload.length / 4),
        'mcp.tool.result.truncated': (result as any)?.truncated ?? false,
      });
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.setAttribute('mcp.tool.duration_ms', performance.now() - t0);
      span.end();
    }
  });
};
```

### What to capture

**Spans:** `mcp.tool/<name>` (parent) → `intervals.api/<endpoint>` (child, with HTTP status, retry count, upstream latency, response bytes).

**Metrics:**
- `mcp.tool.calls` (counter, by tool + outcome)
- `mcp.tool.duration` (histogram, by tool)
- `mcp.tool.result_tokens` (histogram) — **your context-budget canary**
- `mcp.tool.truncations` (counter)
- `intervals.api.errors` (counter, by status)

**Redaction:** athlete ID, tokens, and free-text notes should never hit a span attribute. Write `redact()` on day one, not after the first leak.

⚠️ The OTel GenAI and MCP semantic conventions moved to a dedicated repository in June 2026 and are still marked *Development* with no official release as of August 2026. Use their attribute names where they exist, pin the version, and expect churn. Say this explicitly in your README — showing you know the ground is moving reads as senior.

---

## 6. Evals

This is the section that separates the project from the thousands of MCP wrappers on GitHub. A RAG or agent system without evaluation is a demo, not a production system.

**The core difficulty:** your unit tests prove the *adapter* is correct. Evals prove the *model can use your tools correctly* — a different failure surface entirely. A tool can be flawlessly implemented and still be unusable because its description is ambiguous or its output is too big.

**Analogy:** unit tests check the tools in the toolbox are sharp. Evals check whether someone handed the toolbox can actually build the shelf.

### Three layers

**Layer 1 — Contract tests (deterministic, fast, not really evals)**
Recorded intervals.icu fixtures → zod schema validation → domain mapping assertions. Runs in milliseconds, catches upstream API drift. Every PR.

**Layer 2 — Tool-trajectory evals (the important one)**

Golden dataset of real questions you'd actually ask, each with the expected tool sequence:

```jsonl
{"id":"load-01","prompt":"How has my training load trended over the last 6 weeks?","expect":{"tools":["get_training_load_summary"],"args":{"weeks":6},"forbidden":["get_recent_activities"]}}
{"id":"detail-01","prompt":"What were the interval splits in Tuesday's session?","expect":{"tools":["get_recent_activities","get_activity_detail"]}}
{"id":"week-01","prompt":"What's on my plan this week?","expect":{"tools":["get_planned_week"]}}
{"id":"cmp-01","prompt":"Compare this month's volume to last month's.","expect":{"tools":["compare_periods"]}}
{"id":"refuse-01","prompt":"What's my FTP going to be in December?","expect":{"tools":[],"behaviour":"declines_or_caveats"}}
```

Aim for **40–60 cases**. Include:
- Happy paths, one per tool
- **Near-miss pairs** — questions that should route to `get_training_load_summary` vs `get_recent_activities`. This is where ambiguous descriptions get caught.
- **Empty results** — a date range with no activities. Does the agent say "no data" or invent some?
- **Out-of-scope** — questions your tools can't answer. Refusal is a passing grade.
- **Multi-step** — requires chaining two tools.

Runner: drive it with the **Vercel AI SDK** (`generateText` with `stopWhen: stepCountIs(n)`, your tools registered) so you control the loop and can inspect every step programmatically. Assert on: tools called, argument correctness, forbidden tools absent, step count.

Metrics to report: **tool-selection accuracy**, **argument accuracy**, **unnecessary-call rate**, **mean steps to answer**.

**Layer 3 — Response-quality evals (LLM-as-judge)**

For cases where the trajectory is right, judge the final answer:

- **Groundedness** — is every number in the answer present in the tool output? This is your hallucination detector and the highest-value judge by far.
- **Completeness** — did it answer the question asked?
- **Calibration** — does it hedge where the data is thin?

Use a *different* model as judge than the one under test. Score 1–5 with a rubric in the judge prompt, and hand-label ~20 cases yourself to check the judge agrees with you. An unvalidated judge is a random number generator with good PR — say so in your README.

**Bonus layer — cost/context regression gate**

Track total tokens per eval case and fail CI on a >20% regression. This is an MCP-specific failure mode almost nobody tests: a tool that starts returning 40 activities instead of 10 quietly destroys the agent's ability to reason, with zero errors thrown.

### CI

```yaml
# .github/workflows/eval.yml  (sketch)
# on: pull_request
# 1. contract tests            -> always, fast
# 2. trajectory evals          -> always, cheap model, fail if accuracy < 0.90
# 3. judge evals               -> on label `run-full-evals` or nightly (costs money)
# 4. token budget check        -> always, fail on >20% regression vs main
```

Commit the eval report as a PR comment. Watching tool-selection accuracy move when you reword a tool description is the moment prompt engineering stops feeling like superstition.

---

## 7. README structure (this is part of the deliverable)

Hiring signal lives here as much as in the code:

1. What it does + a 20-second demo GIF of Claude Code using it
2. Architecture diagram (Mermaid) showing both auth axes
3. **Tool design rationale** — why `get_training_load_summary` instead of `list_activities`, with the token math
4. **Eval results table** with real numbers, including the cases that fail
5. **Honest limitations** — no refresh tokens, judge not fully validated, semconv unstable
6. Observability screenshot: a trace tree with the tool span and its HTTP child

Section 4 and 5 are what a senior reviewer reads. A project that reports 87% tool-selection accuracy and explains the 13% is more credible than one claiming 100%.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| OAuth app approval is human-gated and unbounded in time | Apply on day 1; build Phases 1–3 with an API key regardless |
| No refresh tokens (Axis B) | Design the token store around re-auth, not refresh; surface a clear "reconnect" error |
| MCP spec churn (2026-07-28 was a major break) | Pin SDK + spec revision in README; isolate transport in `src/mcp/` only |
| OTel MCP semconv still in Development | Pin the version; wrap attribute names behind your telemetry port |
| Eval costs | Cheap model for trajectory, expensive judge nightly only |
| Scope creep into write tools | Read-only until evals are green |

---

## Sources

- [Intervals.icu OAuth support (forum)](https://forum.intervals.icu/t/intervals-icu-oauth-support/2759) — flow, scopes, no refresh tokens, approval requirement
- [API access to Intervals.icu (forum)](https://forum.intervals.icu/t/api-access-to-intervals-icu/609) — API key / basic auth for personal use
- [Intervals.icu API Integration Cookbook](https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090)
- [Build an MCP Server in TypeScript: A Production Guide](https://theroadtoenterprise.com/blog/build-mcp-server-typescript) — resource-server model, transports
- [mcp-oauth-starter (2026-07-28 spec)](https://github.com/specter-systems/mcp-oauth-starter) — what changed in the July 2026 revision
- [Zuplo: OAuth 2.1 for MCP servers](https://zuplo.com/learn/mcp/authentication/oauth-2-1) — the discovery exchange, step by step
- [WorkOS: stateless MCP server on 2026-07-28](https://workos.com/blog/build-stateless-mcp-server-2026-07-28-authkit)
- [Elastic: tracing MCP tool calls with OpenTelemetry](https://www.elastic.co/observability-labs/blog/mcp-tracing-opentelemetry-elastic-apm) — the wrapper pattern
- [groundcover: MCP spec deprecates custom logging for OTel](https://www.groundcover.com/blog/mcp-spec-update-2026-07-28)
- [TrueFoundry: OTel GenAI semantic conventions status](https://www.truefoundry.com/blog/opentelemetry-genai-semantic-conventions)
- [Vercel: How to build AI agents with the AI SDK](https://vercel.com/kb/guide/how-to-build-ai-agents-with-vercel-and-the-ai-sdk) — agent loop for the eval runner
- [dataskew.io AI engineering roadmap](https://dataskew.io/roadmaps/ai-engineering/) — evals as portfolio differentiator

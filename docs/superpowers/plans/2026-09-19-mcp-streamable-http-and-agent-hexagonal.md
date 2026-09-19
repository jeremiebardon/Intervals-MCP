# MCP Streamable HTTP + Agent NestJS/Hexagonal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `@intervals/mcp-server` from stdio to the MCP Streamable HTTP transport, rewrite `@intervals/agent` as a NestJS app in hexagonal (ports & adapters) style that reaches mcp-server over the network, make `docker-compose.yml` environment-aware across dev/preprod/prod with hot reload in dev, and add health/liveness/Prometheus endpoints to both apps.

**Architecture:** Both apps become long-lived NestJS HTTP servers. mcp-server keeps its existing domain/application/infrastructure hexagonal split and adds an `McpController` + `McpTransportService` inbound adapter using `@modelcontextprotocol/sdk`'s stateless `StreamableHTTPServerTransport` (one fresh `McpServer`+transport per request, matching the SDK's documented stateless pattern). The agent gets a parallel domain/application/infrastructure split for the first time: a `Question`/`Answer` domain, one outbound `AgentInvokerPort`, and a `LangGraphAgentAdapter` that owns `ChatOllama` + `MultiServerMCPClient` (now pointed at mcp-server over HTTP, no more subprocess spawning) + `createReactAgent`. Both apps get `@nestjs/terminus` health endpoints and `@willsoto/nestjs-prometheus` metrics. `docker-compose.yml` becomes prod-shaped and tier-agnostic; `docker-compose.override.yml` is the only dev-specific file (bind mounts + watch-mode build target), auto-merged only when present.

**Tech Stack:** NestJS 11, `@modelcontextprotocol/sdk` 1.30, `@langchain/mcp-adapters`, `@langchain/langgraph`, `@nestjs/terminus`, `@willsoto/nestjs-prometheus`, `nest-commander`, Jest/ts-jest, pnpm workspaces, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-19-mcp-streamable-http-and-agent-hexagonal-design.md`

## Global Constraints

- Package manager stays pnpm (`pnpm@12.4.1`); test runner stays Jest.
- TypeScript strict mode everywhere; `module`/`moduleResolution` stay `nodenext`; packages stay CommonJS (no `"type": "module"`).
- mcp-server's existing use-case/adapter/contract test suite must stay green throughout every task — it is the regression net.
- No real secrets committed; every `.env*` file except `*.example` files stays gitignored (already true for `.env`; new `.env.preprod`/`.env.production` must be added to `.gitignore`).
- Moves use `git mv` so history follows the files.
- `mcp-server` drops stdio entirely (no dual-transport). Streamable HTTP only.
- The agent's outbound MCP connection is HTTP (`transport: 'http'`), never stdio subprocess spawning.
- No live intervals.icu network call in mcp-server's readiness check (config-presence only) — the API key is validated lazily by design.
- No custom Prometheus business metrics and no `prometheus` compose service in this plan — endpoints only.

---

### Task 1: mcp-server — Streamable HTTP transport, drop stdio

**Files:**
- Create: `apps/mcp-server/src/mcp/mcp-transport.service.ts`
- Create: `apps/mcp-server/src/mcp/mcp.controller.ts`
- Create: `apps/mcp-server/src/mcp/__tests__/mcp.controller.spec.ts`
- Modify: `apps/mcp-server/src/mcp/mcp.module.ts`
- Modify: `apps/mcp-server/src/mcp/server.ts` (delete — superseded)
- Modify: `apps/mcp-server/src/main.ts`
- Modify: `apps/mcp-server/package.json` (new dep: `express`'s types come via `@types/express` — check first; add if missing)

**Interfaces:**
- Produces: `McpTransportService.handleRequest(req: Request, res: Response, body: unknown): Promise<void>` — used by `McpController`. `McpController` routes `POST/GET/DELETE /mcp`.

- [ ] **Step 1: Delete the stdio transport file and its export**

Delete `apps/mcp-server/src/mcp/server.ts` entirely (it exported `startMcpServer`, which is superseded by DI-wired controllers below).

```bash
git rm apps/mcp-server/src/mcp/server.ts
```

- [ ] **Step 2: Write `McpTransportService`**

Create `apps/mcp-server/src/mcp/mcp-transport.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { McpTool } from './tool';
import { toMcpError } from './errors';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { ActivityIntervalsTool } from './tools/activity-intervals.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';
import { TrainingLoadSummaryTool } from './tools/training-load-summary.tool';
import { ComparePeriodsTool } from './tools/compare-periods.tool';

function registerTool(
  server: McpServer,
  tool: McpTool<unknown, unknown>,
): void {
  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: tool.inputSchema },
    async (input: unknown) => {
      try {
        const result = await tool.execute(input);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (err) {
        const mapped = toMcpError(err);
        return {
          content: [{ type: 'text', text: JSON.stringify(mapped) }],
          isError: true,
        };
      }
    },
  );
}

// Streamable HTTP stateless mode: a fresh McpServer + transport per request,
// closed when the response closes. This is the SDK's documented stateless
// pattern -- reusing one transport across concurrent requests is only valid
// in stateful (session-ID) mode, which this server does not need (exactly
// one long-lived agent client, all tools read-only).
@Injectable()
export class McpTransportService {
  constructor(
    private readonly recentActivities: RecentActivitiesTool,
    private readonly activityDetail: ActivityDetailTool,
    private readonly activityIntervals: ActivityIntervalsTool,
    private readonly wellnessTrend: WellnessTrendTool,
    private readonly plannedWeek: PlannedWeekTool,
    private readonly trainingLoadSummary: TrainingLoadSummaryTool,
    private readonly comparePeriods: ComparePeriodsTool,
  ) {}

  async handleRequest(
    req: Request,
    res: Response,
    body: unknown,
  ): Promise<void> {
    const server = new McpServer({
      name: 'intervals-icu-mcp',
      version: '0.1.0',
    });
    for (const tool of [
      this.recentActivities,
      this.activityDetail,
      this.activityIntervals,
      this.wellnessTrend,
      this.plannedWeek,
      this.trainingLoadSummary,
      this.comparePeriods,
    ]) {
      registerTool(server, tool);
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  }
}
```

- [ ] **Step 3: Write `McpController`**

Create `apps/mcp-server/src/mcp/mcp.controller.ts`:

```typescript
import { Controller, Post, Get, Delete, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpTransportService } from './mcp-transport.service';

const METHOD_NOT_ALLOWED_BODY = JSON.stringify({
  jsonrpc: '2.0',
  error: { code: -32000, message: 'Method not allowed.' },
  id: null,
});

@Controller('mcp')
export class McpController {
  constructor(private readonly transportService: McpTransportService) {}

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.transportService.handleRequest(req, res, req.body);
  }

  // Stateless mode creates a new transport per POST, so there is never a
  // standing session for a GET stream or a DELETE to terminate.
  @Get()
  handleGet(@Res() res: Response): void {
    res.writeHead(405, { 'content-type': 'application/json' });
    res.end(METHOD_NOT_ALLOWED_BODY);
  }

  @Delete()
  handleDelete(@Res() res: Response): void {
    res.writeHead(405, { 'content-type': 'application/json' });
    res.end(METHOD_NOT_ALLOWED_BODY);
  }
}
```

- [ ] **Step 4: Wire both into `McpModule`**

Modify `apps/mcp-server/src/mcp/mcp.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { ActivityIntervalsTool } from './tools/activity-intervals.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';
import { TrainingLoadSummaryTool } from './tools/training-load-summary.tool';
import { ComparePeriodsTool } from './tools/compare-periods.tool';
import { McpController } from './mcp.controller';
import { McpTransportService } from './mcp-transport.service';

export const tools = [
  RecentActivitiesTool,
  ActivityDetailTool,
  ActivityIntervalsTool,
  WellnessTrendTool,
  PlannedWeekTool,
  TrainingLoadSummaryTool,
  ComparePeriodsTool,
];

@Module({
  imports: [ApplicationModule],
  controllers: [McpController],
  providers: [...tools, McpTransportService],
  exports: tools,
})
export class McpModule {}
```

- [ ] **Step 5: Switch `main.ts` to a full HTTP app on `MCP_PORT`**

Replace `apps/mcp-server/src/main.ts`:

```typescript
import './instrumentation';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.MCP_PORT ?? 3300);
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

(The `logger: ['error', 'warn']` restriction from the old `createApplicationContext` call is gone — that only existed because stdio shared stdout with the protocol.)

- [ ] **Step 6: Add `@nestjs/platform-express` if not already resolvable**

`NestFactory.create` needs an HTTP platform adapter. Check first:

Run: `pnpm --filter @intervals/mcp-server exec node -e "require.resolve('@nestjs/platform-express')"`

If it errors (module not found), run:

Run: `pnpm add @nestjs/platform-express --filter @intervals/mcp-server`

- [ ] **Step 7: Write the transport integration test using a real MCP client**

Create `apps/mcp-server/src/mcp/__tests__/mcp.controller.spec.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { AppModule } from '../../app.module';

describe('MCP Streamable HTTP transport', () => {
  process.env.INTERVALS_API_KEY = 'test-key';
  let app: import('@nestjs/common').INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port =
      typeof address === 'object' && address ? address.port : address;
    baseUrl = `http://127.0.0.1:${port}/mcp`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists all 7 tools over a real Streamable HTTP round trip', async () => {
    const client = new Client({ name: 'test-client', version: '0.0.1' });
    const transport = new StreamableHTTPClientTransport(new URL(baseUrl));
    await client.connect(transport);

    const { tools } = await client.listTools();

    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        'get_recent_activities',
        'get_activity_detail',
        'get_activity_intervals',
        'get_wellness_trend',
        'get_planned_week',
        'get_training_load_summary',
        'compare_periods',
      ].sort(),
    );

    await client.close();
  });

  it('returns 405 for GET (stateless mode has no standing session)', async () => {
    const response = await fetch(baseUrl, { method: 'GET' });
    expect(response.status).toBe(405);
  });

  it('returns 405 for DELETE (stateless mode has no session to terminate)', async () => {
    const response = await fetch(baseUrl, { method: 'DELETE' });
    expect(response.status).toBe(405);
  });
});
```

- [ ] **Step 8: Run the test suite**

Run: `pnpm --filter @intervals/mcp-server test`
Expected: all tests pass, including the 3 new ones in `mcp.controller.spec.ts`. If `Client`/`StreamableHTTPClientTransport` imports fail to resolve under `ts-jest`, check `apps/mcp-server/package.json`'s jest config — no changes should be needed since `@modelcontextprotocol/sdk` is already a dependency, but confirm `moduleFileExtensions`/`transform` still match (unchanged from today).

- [ ] **Step 9: Commit**

```bash
git add apps/mcp-server/src/mcp apps/mcp-server/src/main.ts apps/mcp-server/package.json
git commit -m "feat(mcp-server): replace stdio transport with Streamable HTTP"
```

---

### Task 2: mcp-server — health and liveness endpoints

**Files:**
- Create: `apps/mcp-server/src/health/health.controller.ts`
- Create: `apps/mcp-server/src/health/health.module.ts`
- Create: `apps/mcp-server/src/health/__tests__/health.controller.spec.ts`
- Modify: `apps/mcp-server/src/app.module.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `GET /health/live` -> `{ status: 'ok' }`; `GET /health/ready` -> Terminus `HealthCheckResult`, 200 when `INTERVALS_API_KEY` is set, 503 otherwise.

- [ ] **Step 1: Add `@nestjs/terminus`**

Run: `pnpm add @nestjs/terminus --filter @intervals/mcp-server`

- [ ] **Step 2: Write the failing test**

Create `apps/mcp-server/src/health/__tests__/health.controller.spec.ts`:

```typescript
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from '../health.controller';

function makeHealthCheckService(): HealthCheckService {
  return {
    check: jest.fn((indicators: Array<() => unknown>) =>
      Promise.all(indicators.map((indicator) => indicator())).then(
        (results) => ({
          status: 'ok',
          info: Object.assign({}, ...results),
          error: {},
          details: Object.assign({}, ...results),
        }),
      ),
    ),
  } as unknown as HealthCheckService;
}

describe('HealthController', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports liveness without checking any dependency', () => {
    const controller = new HealthController(makeHealthCheckService());
    expect(controller.live()).toEqual({ status: 'ok' });
  });

  it('reports ready when INTERVALS_API_KEY is set', async () => {
    process.env.INTERVALS_API_KEY = 'test-key';
    const controller = new HealthController(makeHealthCheckService());
    await expect(controller.ready()).resolves.toMatchObject({
      status: 'ok',
    });
  });

  it('rejects ready when INTERVALS_API_KEY is missing', async () => {
    delete process.env.INTERVALS_API_KEY;
    const controller = new HealthController(makeHealthCheckService());
    await expect(controller.ready()).rejects.toThrow(/INTERVALS_API_KEY/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @intervals/mcp-server test -- health.controller`
Expected: FAIL — `Cannot find module '../health.controller'`

- [ ] **Step 4: Write `HealthController`**

Create `apps/mcp-server/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  HealthCheckError,
  HealthIndicatorResult,
} from '@nestjs/terminus';

function checkIntervalsConfig(): HealthIndicatorResult {
  if (!process.env.INTERVALS_API_KEY) {
    throw new HealthCheckError('INTERVALS_API_KEY is not set', {
      config: { status: 'down' },
    });
  }
  return { config: { status: 'up' } };
}

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([checkIntervalsConfig]);
  }
}
```

- [ ] **Step 5: Write `HealthModule`**

Create `apps/mcp-server/src/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 6: Import `HealthModule` in `AppModule`**

Modify `apps/mcp-server/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ApplicationModule } from './application/application.module';
import { McpModule } from './mcp/mcp.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [InfrastructureModule, ApplicationModule, McpModule, HealthModule],
})
export class AppModule {}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter @intervals/mcp-server test`
Expected: PASS, all suites green.

- [ ] **Step 8: Commit**

```bash
git add apps/mcp-server/src/health apps/mcp-server/src/app.module.ts apps/mcp-server/package.json
git commit -m "feat(mcp-server): add liveness and readiness endpoints"
```

---

### Task 3: mcp-server — Prometheus metrics endpoint

**Files:**
- Modify: `apps/mcp-server/src/health/health.module.ts`
- Create: `apps/mcp-server/src/health/__tests__/metrics.spec.ts`

**Interfaces:**
- Consumes: the running Nest app from Task 2's `HealthModule`.
- Produces: `GET /metrics` in Prometheus text format.

- [ ] **Step 1: Add `@willsoto/nestjs-prometheus`**

Run: `pnpm add @willsoto/nestjs-prometheus --filter @intervals/mcp-server`

- [ ] **Step 2: Write the failing test**

Create `apps/mcp-server/src/health/__tests__/metrics.spec.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';

describe('GET /metrics', () => {
  process.env.INTERVALS_API_KEY = 'test-key';
  let app: import('@nestjs/common').INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port =
      typeof address === 'object' && address ? address.port : address;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns Prometheus text format with default process metrics', async () => {
    const response = await fetch(`${baseUrl}/metrics`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/text\/plain/);
    expect(body).toMatch(/process_cpu_user_seconds_total/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @intervals/mcp-server test -- metrics`
Expected: FAIL — 404 on `/metrics` (module not registered yet).

- [ ] **Step 4: Register `PrometheusModule` in `HealthModule`**

Modify `apps/mcp-server/src/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    PrometheusModule.register({ defaultMetrics: { enabled: true } }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @intervals/mcp-server test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mcp-server/src/health apps/mcp-server/package.json
git commit -m "feat(mcp-server): expose Prometheus metrics at /metrics"
```

---

### Task 4: mcp-server — multi-stage Dockerfile

**Files:**
- Create: `apps/mcp-server/Dockerfile`

**Interfaces:**
- Produces: build targets `deps`, `dev`, `build`, `production`, consumed by `docker-compose.yml` (Task 13) and `docker-compose.override.yml` (Task 14).

- [ ] **Step 1: Write the Dockerfile**

Create `apps/mcp-server/Dockerfile`:

```dockerfile
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
```

- [ ] **Step 2: Build the production target standalone to verify it compiles**

Run: `docker build -f apps/mcp-server/Dockerfile --target production -t mcp-server-prod-check .`
Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mcp-server/Dockerfile
git commit -m "feat(mcp-server): add multi-stage Dockerfile (dev/build/production)"
```

---

### Task 5: agent — domain value objects

**Files:**
- Create: `apps/agent/src/domain/question.ts`
- Create: `apps/agent/src/domain/answer.ts`
- Create: `apps/agent/src/domain/__tests__/question.spec.ts`
- Create: `apps/agent/src/domain/__tests__/answer.spec.ts`

**Interfaces:**
- Produces: `class Question { readonly value: string }` (constructor throws `InvalidQuestionError` for non-string/empty input), `class InvalidQuestionError extends Error`, `class Answer { readonly value: string }`. Used by Tasks 6-9.

- [ ] **Step 1: Write the failing tests**

Create `apps/agent/src/domain/__tests__/question.spec.ts`:

```typescript
import { Question, InvalidQuestionError } from '../question';

describe('Question', () => {
  it('holds a non-empty string', () => {
    expect(new Question('how is my form?').value).toBe('how is my form?');
  });

  it('rejects an empty string', () => {
    expect(() => new Question('')).toThrow(InvalidQuestionError);
  });

  it('rejects a whitespace-only string', () => {
    expect(() => new Question('   ')).toThrow(InvalidQuestionError);
  });

  it('rejects a non-string value', () => {
    expect(() => new Question(42)).toThrow(InvalidQuestionError);
  });
});
```

Create `apps/agent/src/domain/__tests__/answer.spec.ts`:

```typescript
import { Answer } from '../answer';

describe('Answer', () => {
  it('holds a string value', () => {
    expect(new Answer('you rode 40km').value).toBe('you rode 40km');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @intervals/agent test`
Expected: FAIL — `Cannot find module '../question'` / `'../answer'`

- [ ] **Step 3: Write `Question`**

Create `apps/agent/src/domain/question.ts`:

```typescript
export class InvalidQuestionError extends Error {}

export class Question {
  readonly value: string;

  constructor(value: unknown) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new InvalidQuestionError('question must be a non-empty string');
    }
    this.value = value;
  }
}
```

- [ ] **Step 4: Write `Answer`**

Create `apps/agent/src/domain/answer.ts`:

```typescript
export class Answer {
  constructor(readonly value: string) {}
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @intervals/agent test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/agent/src/domain
git commit -m "feat(agent): add Question and Answer domain value objects"
```

---

### Task 6: agent — application layer (port + use-case)

**Files:**
- Create: `apps/agent/src/application/ports/agent-invoker.port.ts`
- Create: `apps/agent/src/application/use-cases/ask-question.use-case.ts`
- Create: `apps/agent/src/application/use-cases/__tests__/ask-question.use-case.spec.ts`
- Create: `apps/agent/src/application/application.module.ts`
- Modify: `apps/agent/package.json` (add `@nestjs/common`, `@nestjs/core`, `reflect-metadata`, `rxjs`)

**Interfaces:**
- Consumes: `Question`, `Answer` from Task 5.
- Produces: `abstract class AgentInvokerPort { abstract invoke(question: Question): Promise<Answer> }`; `class AskQuestionUseCase { execute(question: Question): Promise<Answer> }`. Used by Tasks 7-9.

- [ ] **Step 1: Add Nest core packages**

Run: `pnpm add @nestjs/common @nestjs/core reflect-metadata rxjs --filter @intervals/agent`

- [ ] **Step 2: Write the failing test**

Create `apps/agent/src/application/use-cases/__tests__/ask-question.use-case.spec.ts`:

```typescript
import { AskQuestionUseCase } from '../ask-question.use-case';
import { AgentInvokerPort } from '../../ports/agent-invoker.port';
import { Question } from '../../../domain/question';
import { Answer } from '../../../domain/answer';

class FakeAgentInvoker extends AgentInvokerPort {
  invoke = jest.fn(async (question: Question) => new Answer(`echo: ${question.value}`));
}

describe('AskQuestionUseCase', () => {
  it('delegates to the agent invoker port and returns its answer', async () => {
    const invoker = new FakeAgentInvoker();
    const useCase = new AskQuestionUseCase(invoker);

    const answer = await useCase.execute(new Question('how is my form?'));

    expect(invoker.invoke).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'how is my form?' }),
    );
    expect(answer.value).toBe('echo: how is my form?');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @intervals/agent test -- ask-question`
Expected: FAIL — `Cannot find module '../ask-question.use-case'`

- [ ] **Step 4: Write `AgentInvokerPort`**

Create `apps/agent/src/application/ports/agent-invoker.port.ts`:

```typescript
import { Question } from '../../domain/question';
import { Answer } from '../../domain/answer';

export abstract class AgentInvokerPort {
  abstract invoke(question: Question): Promise<Answer>;
}
```

- [ ] **Step 5: Write `AskQuestionUseCase`**

Create `apps/agent/src/application/use-cases/ask-question.use-case.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import {
  MimeType,
  OpenInferenceSpanKind,
  SemanticConventions,
} from '@arizeai/openinference-semantic-conventions';
import { AgentInvokerPort } from '../ports/agent-invoker.port';
import { Question } from '../../domain/question';
import { Answer } from '../../domain/answer';

const tracer = trace.getTracer('@intervals/agent');

@Injectable()
export class AskQuestionUseCase {
  constructor(private readonly agentInvoker: AgentInvokerPort) {}

  async execute(question: Question): Promise<Answer> {
    return tracer.startActiveSpan('agent.invoke', async (span) => {
      try {
        span.setAttribute(
          SemanticConventions.OPENINFERENCE_SPAN_KIND,
          OpenInferenceSpanKind.AGENT,
        );
        span.setAttribute(SemanticConventions.INPUT_VALUE, question.value);
        span.setAttribute(SemanticConventions.INPUT_MIME_TYPE, MimeType.TEXT);

        const answer = await this.agentInvoker.invoke(question);

        span.setAttribute(SemanticConventions.OUTPUT_VALUE, answer.value);
        span.setAttribute(SemanticConventions.OUTPUT_MIME_TYPE, MimeType.TEXT);
        return answer;
      } finally {
        span.end();
      }
    });
  }
}
```

- [ ] **Step 6: Write `ApplicationModule`** (imports `InfrastructureModule`, created in Task 7 — write this file now, Task 7 will make it resolve)

Create `apps/agent/src/application/application.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AskQuestionUseCase } from './use-cases/ask-question.use-case';

@Module({
  imports: [InfrastructureModule],
  providers: [AskQuestionUseCase],
  exports: [AskQuestionUseCase],
})
export class ApplicationModule {}
```

This module file will not compile until Task 7 creates `../infrastructure/infrastructure.module`. Do not run a full `pnpm build` yet — only the unit test below, which doesn't import this module.

- [ ] **Step 7: Run the use-case test to verify it passes**

Run: `pnpm --filter @intervals/agent test -- ask-question`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/agent/src/application apps/agent/package.json
git commit -m "feat(agent): add AgentInvokerPort and AskQuestionUseCase"
```

---

### Task 7: agent — infrastructure layer (LangGraph adapter over HTTP)

**Files:**
- Create: `apps/agent/src/infrastructure/langgraph/langgraph-agent.adapter.ts`
- Create: `apps/agent/src/infrastructure/langgraph/__tests__/langgraph-agent.adapter.spec.ts`
- Create: `apps/agent/src/infrastructure/infrastructure.module.ts`
- Delete: `apps/agent/src/graph.ts`
- Modify: `apps/agent/package.json` (add `@nestjs/config`)

**Interfaces:**
- Consumes: `AgentInvokerPort` from Task 6; `Question`, `Answer` from Task 5.
- Produces: `class LangGraphAgentAdapter implements AgentInvokerPort, OnModuleInit`; `InfrastructureModule` exporting `AgentInvokerPort`. Used by Task 8/9's `AppModule`.

- [ ] **Step 1: Add `@nestjs/config`**

Run: `pnpm add @nestjs/config --filter @intervals/agent`

- [ ] **Step 2: Delete the old subprocess-spawning graph module**

```bash
git rm apps/agent/src/graph.ts
```

(Its logic — building `ChatOllama`, the MCP client, and `createReactAgent` — moves into the adapter below, with the MCP client now pointed at a URL instead of spawning `mcp-server/dist/main.js`.)

- [ ] **Step 3: Write the failing test**

Create `apps/agent/src/infrastructure/langgraph/__tests__/langgraph-agent.adapter.spec.ts`:

```typescript
import { LangGraphAgentAdapter } from '../langgraph-agent.adapter';
import { Question } from '../../../domain/question';

const mockGetTools = jest.fn().mockResolvedValue([]);
const mockMcpClientCtor = jest.fn();
jest.mock('@langchain/mcp-adapters', () => ({
  MultiServerMCPClient: jest.fn().mockImplementation((config: unknown) => {
    mockMcpClientCtor(config);
    return { getTools: mockGetTools };
  }),
}));

jest.mock('@langchain/ollama', () => ({
  ChatOllama: jest.fn().mockImplementation((config: unknown) => ({
    __config: config,
  })),
}));

const mockAgentInvoke = jest.fn();
jest.mock('@langchain/langgraph/prebuilt', () => ({
  createReactAgent: jest.fn().mockImplementation(() => ({
    invoke: mockAgentInvoke,
  })),
}));

describe('LangGraphAgentAdapter', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, MCP_SERVER_URL: 'http://mcp-server:3300/mcp' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('connects to the MCP server over HTTP using MCP_SERVER_URL', async () => {
    const adapter = new LangGraphAgentAdapter();
    await adapter.onModuleInit();

    expect(mockMcpClientCtor).toHaveBeenCalledWith({
      'intervals-icu': {
        transport: 'http',
        url: 'http://mcp-server:3300/mcp',
      },
    });
  });

  it('invokes the react agent and returns its last message as the answer', async () => {
    mockAgentInvoke.mockResolvedValue({
      messages: [{ content: 'ignored' }, { content: 'you rode 40km' }],
    });
    const adapter = new LangGraphAgentAdapter();
    await adapter.onModuleInit();

    const answer = await adapter.invoke(new Question('how far did I ride?'));

    expect(mockAgentInvoke).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'how far did I ride?' }],
    });
    expect(answer.value).toBe('you rode 40km');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter @intervals/agent test -- langgraph-agent.adapter`
Expected: FAIL — `Cannot find module '../langgraph-agent.adapter'`

- [ ] **Step 5: Write `LangGraphAgentAdapter`**

Create `apps/agent/src/infrastructure/langgraph/langgraph-agent.adapter.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOllama } from '@langchain/ollama';
import { AgentInvokerPort } from '../../application/ports/agent-invoker.port';
import { Question } from '../../domain/question';
import { Answer } from '../../domain/answer';

type ReactAgent = { invoke: (input: unknown) => Promise<{ messages: Array<{ content: unknown }> }> };

@Injectable()
export class LangGraphAgentAdapter
  implements AgentInvokerPort, OnModuleInit
{
  private agent!: ReactAgent;

  async onModuleInit(): Promise<void> {
    const mcpClient = new MultiServerMCPClient({
      'intervals-icu': {
        transport: 'http',
        url: process.env.MCP_SERVER_URL ?? 'http://mcp-server:3300/mcp',
      },
    });
    const tools = await mcpClient.getTools();

    const llm = new ChatOllama({
      model: process.env.OLLAMA_MODEL ?? 'gemma4:12b',
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    });

    this.agent = createReactAgent({ llm, tools }) as unknown as ReactAgent;
  }

  async invoke(question: Question): Promise<Answer> {
    const result = await this.agent.invoke({
      messages: [{ role: 'user', content: question.value }],
    });
    const lastMessage = result.messages[result.messages.length - 1];
    return new Answer(String(lastMessage.content));
  }
}
```

- [ ] **Step 6: Write `InfrastructureModule`**

Create `apps/agent/src/infrastructure/infrastructure.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentInvokerPort } from '../application/ports/agent-invoker.port';
import { LangGraphAgentAdapter } from './langgraph/langgraph-agent.adapter';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [{ provide: AgentInvokerPort, useClass: LangGraphAgentAdapter }],
  exports: [AgentInvokerPort],
})
export class InfrastructureModule {}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter @intervals/agent test`
Expected: PASS — this also makes `ApplicationModule` (Task 6, Step 6) resolvable now that `infrastructure.module` exists.

- [ ] **Step 8: Commit**

```bash
git add apps/agent/src/infrastructure apps/agent/package.json
git rm apps/agent/src/graph.ts 2>/dev/null || true
git commit -m "feat(agent): add LangGraphAgentAdapter connecting to mcp-server over HTTP"
```

---

### Task 8: agent — HTTP inbound adapter and Nest bootstrap

**Files:**
- Create: `apps/agent/src/http/agent.controller.ts`
- Create: `apps/agent/src/http/__tests__/agent.controller.spec.ts`
- Create: `apps/agent/src/app.module.ts`
- Create: `apps/agent/nest-cli.json`
- Modify: `apps/agent/src/main.ts`
- Delete: `apps/agent/src/server.ts`
- Delete: `apps/agent/src/run.ts`
- Modify: `apps/agent/package.json` (add `@nestjs/platform-express`, `@nestjs/cli` devDependency; update scripts)

**Interfaces:**
- Consumes: `AskQuestionUseCase` from Task 6, `ApplicationModule`/`InfrastructureModule` from Tasks 6-7.
- Produces: `POST /invoke` `{question: string} -> {answer: string}`. `AppModule` (imported by Tasks 9-11).

- [ ] **Step 1: Add Express platform + Nest CLI**

Run: `pnpm add @nestjs/platform-express --filter @intervals/agent`
Run: `pnpm add -D @nestjs/cli --filter @intervals/agent`

- [ ] **Step 2: Delete the raw http server and the old run.ts (logic now split between the use-case and the adapter)**

```bash
git rm apps/agent/src/server.ts apps/agent/src/run.ts
```

- [ ] **Step 3: Write the failing test**

Create `apps/agent/src/http/__tests__/agent.controller.spec.ts`:

```typescript
import { BadRequestException } from '@nestjs/common';
import { AgentController } from '../agent.controller';
import { AskQuestionUseCase } from '../../application/use-cases/ask-question.use-case';
import { Answer } from '../../domain/answer';

describe('AgentController', () => {
  it('returns the answer for a valid question', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue(new Answer('42')),
    } as unknown as AskQuestionUseCase;
    const controller = new AgentController(useCase);

    await expect(
      controller.invoke({ question: 'what is my FTP?' }),
    ).resolves.toEqual({ answer: '42' });
  });

  it('throws BadRequestException for a non-string question', async () => {
    const useCase = { execute: jest.fn() } as unknown as AskQuestionUseCase;
    const controller = new AgentController(useCase);

    await expect(controller.invoke({ question: 42 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for an empty question', async () => {
    const useCase = { execute: jest.fn() } as unknown as AskQuestionUseCase;
    const controller = new AgentController(useCase);

    await expect(controller.invoke({ question: '' })).rejects.toThrow(
      BadRequestException,
    );
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter @intervals/agent test -- agent.controller`
Expected: FAIL — `Cannot find module '../agent.controller'`

- [ ] **Step 5: Write `AgentController`**

Create `apps/agent/src/http/agent.controller.ts`:

```typescript
import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AskQuestionUseCase } from '../application/use-cases/ask-question.use-case';
import { Question, InvalidQuestionError } from '../domain/question';

interface InvokeRequestBody {
  question?: unknown;
}

interface InvokeResponseBody {
  answer: string;
}

@Controller()
export class AgentController {
  constructor(private readonly askQuestion: AskQuestionUseCase) {}

  @Post('invoke')
  async invoke(@Body() body: InvokeRequestBody): Promise<InvokeResponseBody> {
    let question: Question;
    try {
      question = new Question(body.question);
    } catch (err) {
      if (err instanceof InvalidQuestionError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const answer = await this.askQuestion.execute(question);
    return { answer: answer.value };
  }
}
```

- [ ] **Step 6: Write `AppModule`**

Create `apps/agent/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ApplicationModule } from './application/application.module';
import { AgentController } from './http/agent.controller';

@Module({
  imports: [InfrastructureModule, ApplicationModule],
  controllers: [AgentController],
})
export class AppModule {}
```

- [ ] **Step 7: Write `nest-cli.json`**

Create `apps/agent/nest-cli.json`:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 8: Replace `main.ts`**

Modify `apps/agent/src/main.ts`:

```typescript
import './instrumentation';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.AGENT_PORT ?? 8787);
  await app.listen(port);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 9: Update `apps/agent/package.json` scripts to the Nest CLI pattern**

Modify the `scripts` block:

```json
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "ask": "node dist/cli.js",
    "test": "jest --passWithNoTests"
  },
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `pnpm --filter @intervals/agent test`
Expected: PASS. (`apps/agent/src/cli.ts` still references the deleted `./run`, so `pnpm --filter @intervals/agent build` will fail until Task 9 rewrites it — do not run a full build yet, only `test`.)

- [ ] **Step 11: Commit**

```bash
git add apps/agent/src/http apps/agent/src/app.module.ts apps/agent/src/main.ts apps/agent/nest-cli.json apps/agent/package.json
git commit -m "feat(agent): add AgentController and Nest HTTP bootstrap"
```

---

### Task 9: agent — CLI inbound adapter (nest-commander)

**Files:**
- Create: `apps/agent/src/cli/ask.command.ts`
- Create: `apps/agent/src/cli/__tests__/ask.command.spec.ts`
- Modify: `apps/agent/src/app.module.ts`
- Modify: `apps/agent/src/cli.ts`
- Modify: `apps/agent/package.json` (add `nest-commander`)

**Interfaces:**
- Consumes: `AskQuestionUseCase` from Task 6.
- Produces: `pnpm --filter @intervals/agent ask "<question>"` prints the answer to stdout and exits 0, or prints an error to stderr and exits 1.

- [ ] **Step 1: Add `nest-commander`**

Run: `pnpm add nest-commander --filter @intervals/agent`

- [ ] **Step 2: Write the failing test**

Create `apps/agent/src/cli/__tests__/ask.command.spec.ts`:

```typescript
import { AskCommand } from '../ask.command';
import { AskQuestionUseCase } from '../../application/use-cases/ask-question.use-case';
import { Answer } from '../../domain/answer';

describe('AskCommand', () => {
  it('prints the answer for the given question', async () => {
    const useCase = {
      execute: jest.fn().mockResolvedValue(new Answer('you rode 40km')),
    } as unknown as AskQuestionUseCase;
    const command = new AskCommand(useCase);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await command.run(['how', 'far', 'did', 'I', 'ride?']);

    expect(useCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'how far did I ride?' }),
    );
    expect(logSpy).toHaveBeenCalledWith('you rode 40km');
    logSpy.mockRestore();
  });

  it('throws when no question is given', async () => {
    const useCase = { execute: jest.fn() } as unknown as AskQuestionUseCase;
    const command = new AskCommand(useCase);

    await expect(command.run([])).rejects.toThrow(/usage:/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @intervals/agent test -- ask.command`
Expected: FAIL — `Cannot find module '../ask.command'`

- [ ] **Step 4: Write `AskCommand`**

Create `apps/agent/src/cli/ask.command.ts`:

```typescript
import { Command, CommandRunner } from 'nest-commander';
import { AskQuestionUseCase } from '../application/use-cases/ask-question.use-case';
import { Question } from '../domain/question';

@Command({ name: 'ask', description: 'Ask the agent a question' })
export class AskCommand extends CommandRunner {
  constructor(private readonly askQuestion: AskQuestionUseCase) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const question = passedParams.join(' ');
    if (!question) {
      throw new Error(
        'usage: pnpm --filter @intervals/agent ask "<question>"',
      );
    }
    const answer = await this.askQuestion.execute(new Question(question));
    console.log(answer.value);
  }
}
```

- [ ] **Step 5: Register `AskCommand` on `AppModule`**

Modify `apps/agent/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ApplicationModule } from './application/application.module';
import { AgentController } from './http/agent.controller';
import { AskCommand } from './cli/ask.command';

@Module({
  imports: [InfrastructureModule, ApplicationModule],
  controllers: [AgentController],
  providers: [AskCommand],
})
export class AppModule {}
```

- [ ] **Step 6: Rewrite `cli.ts` as a nest-commander bootstrap**

Modify `apps/agent/src/cli.ts`:

```typescript
import './instrumentation';
import { CommandFactory } from 'nest-commander';
import { AppModule } from './app.module';
import { telemetry } from './instrumentation';

async function bootstrap(): Promise<void> {
  await CommandFactory.run(AppModule, { logger: ['error', 'warn'] });
}

bootstrap()
  .then(async () => {
    await telemetry.forceFlush();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await telemetry.forceFlush();
    process.exit(1);
  });
```

- [ ] **Step 7: Run the full agent test suite and a real build**

Run: `pnpm --filter @intervals/agent test`
Expected: PASS.

Run: `pnpm --filter @intervals/agent build`
Expected: succeeds — this is the first point since Task 8 where a full build is expected to work end-to-end (all of `graph.ts`/`run.ts`/`server.ts` are gone and every remaining import resolves).

- [ ] **Step 8: Commit**

```bash
git add apps/agent/src/cli apps/agent/src/cli.ts apps/agent/src/app.module.ts apps/agent/package.json
git commit -m "feat(agent): add nest-commander ask CLI command"
```

---

### Task 10: agent — health and liveness endpoints

**Files:**
- Create: `apps/agent/src/health/health.controller.ts`
- Create: `apps/agent/src/health/health.module.ts`
- Create: `apps/agent/src/health/__tests__/health.controller.spec.ts`
- Modify: `apps/agent/src/app.module.ts`
- Modify: `apps/agent/package.json` (add `@nestjs/terminus`, `@nestjs/axios`, `axios`)

**Interfaces:**
- Produces: `GET /health/live` -> `{ status: 'ok' }`; `GET /health/ready` -> 200 when mcp-server and Ollama are both reachable, 503 otherwise.

- [ ] **Step 1: Add dependencies**

Run: `pnpm add @nestjs/terminus @nestjs/axios axios --filter @intervals/agent`

- [ ] **Step 2: Write the failing test**

Create `apps/agent/src/health/__tests__/health.controller.spec.ts`:

```typescript
import { HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { HealthController } from '../health.controller';

function makeHealthCheckService(): HealthCheckService {
  return {
    check: jest.fn((indicators: Array<() => unknown>) =>
      Promise.all(indicators.map((indicator) => indicator())).then(
        (results) => ({
          status: 'ok',
          info: Object.assign({}, ...results),
          error: {},
          details: Object.assign({}, ...results),
        }),
      ),
    ),
  } as unknown as HealthCheckService;
}

describe('HealthController', () => {
  it('reports liveness without checking any dependency', () => {
    const http = { pingCheck: jest.fn() } as unknown as HttpHealthIndicator;
    const controller = new HealthController(makeHealthCheckService(), http);
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(http.pingCheck).not.toHaveBeenCalled();
  });

  it('pings mcp-server and Ollama for readiness', async () => {
    const http = {
      pingCheck: jest.fn().mockResolvedValue({ dep: { status: 'up' } }),
    } as unknown as HttpHealthIndicator;
    const controller = new HealthController(makeHealthCheckService(), http);

    await controller.ready();

    expect(http.pingCheck).toHaveBeenCalledWith(
      'mcp-server',
      expect.stringContaining('/health/live'),
    );
    expect(http.pingCheck).toHaveBeenCalledWith(
      'ollama',
      expect.any(String),
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @intervals/agent test -- health.controller`
Expected: FAIL — `Cannot find module '../health.controller'`

- [ ] **Step 4: Write `HealthController`**

Create `apps/agent/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, HttpHealthIndicator } from '@nestjs/terminus';

function mcpServerLiveUrl(): string {
  const mcpServerUrl = process.env.MCP_SERVER_URL ?? 'http://mcp-server:3300/mcp';
  return new URL('/health/live', mcpServerUrl).toString();
}

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
  ) {}

  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
    return this.health.check([
      () => this.http.pingCheck('mcp-server', mcpServerLiveUrl()),
      () => this.http.pingCheck('ollama', ollamaUrl),
    ]);
  }
}
```

- [ ] **Step 5: Write `HealthModule`**

Create `apps/agent/src/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 6: Import `HealthModule` in `AppModule`**

Modify `apps/agent/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ApplicationModule } from './application/application.module';
import { AgentController } from './http/agent.controller';
import { AskCommand } from './cli/ask.command';
import { HealthModule } from './health/health.module';

@Module({
  imports: [InfrastructureModule, ApplicationModule, HealthModule],
  controllers: [AgentController],
  providers: [AskCommand],
})
export class AppModule {}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm --filter @intervals/agent test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/agent/src/health apps/agent/src/app.module.ts apps/agent/package.json
git commit -m "feat(agent): add liveness and readiness endpoints"
```

---

### Task 11: agent — Prometheus metrics endpoint

**Files:**
- Modify: `apps/agent/src/health/health.module.ts`
- Create: `apps/agent/src/health/__tests__/metrics.spec.ts`
- Modify: `apps/agent/package.json` (add `@willsoto/nestjs-prometheus`)

**Interfaces:**
- Produces: `GET /metrics` in Prometheus text format.

- [ ] **Step 1: Add `@willsoto/nestjs-prometheus`**

Run: `pnpm add @willsoto/nestjs-prometheus --filter @intervals/agent`

- [ ] **Step 2: Write the failing test**

Create `apps/agent/src/health/__tests__/metrics.spec.ts`:

```typescript
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { HealthModule } from '../health.module';

// A minimal host module rather than the real AppModule: AppModule pulls in
// InfrastructureModule, whose LangGraphAgentAdapter.onModuleInit() reaches
// out to MCP_SERVER_URL/OLLAMA_BASE_URL at startup. This test only cares
// about the /metrics wiring, which lives entirely in HealthModule.
@Module({ imports: [HealthModule] })
class MetricsTestModule {}

describe('GET /metrics', () => {
  let app: import('@nestjs/common').INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(MetricsTestModule, { logger: false });
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port =
      typeof address === 'object' && address ? address.port : address;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns Prometheus text format with default process metrics', async () => {
    const response = await fetch(`${baseUrl}/metrics`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/text\/plain/);
    expect(body).toMatch(/process_cpu_user_seconds_total/);
  });
});
```

- [ ] **Step 3: Register `PrometheusModule` in `HealthModule`**

Modify `apps/agent/src/health/health.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    PrometheusModule.register({ defaultMetrics: { enabled: true } }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @intervals/agent test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/agent/src/health apps/agent/package.json
git commit -m "feat(agent): expose Prometheus metrics at /metrics"
```

---

### Task 12: agent — multi-stage Dockerfile

**Files:**
- Modify: `apps/agent/Dockerfile`

**Interfaces:**
- Produces: build targets `deps`, `dev`, `build`, `production`, consumed by `docker-compose.yml` (Task 13) and `docker-compose.override.yml` (Task 14).

- [ ] **Step 1: Rewrite the Dockerfile as multi-stage**

Replace `apps/agent/Dockerfile`:

```dockerfile
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
```

- [ ] **Step 2: Build the production target standalone to verify it compiles**

Run: `docker build -f apps/agent/Dockerfile --target production -t agent-prod-check .`
Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/agent/Dockerfile
git commit -m "feat(agent): rewrite Dockerfile as multi-stage (dev/build/production)"
```

---

### Task 13: docker-compose.yml — mcp-server service, updated agent service, healthchecks

**Files:**
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces: services `db`, `phoenix`, `mcp-server`, `agent`, all prod-shaped (target `production`), consumed as-is by preprod/prod and overridden for dev by Task 14.

- [ ] **Step 1: Rewrite `docker-compose.yml`**

Replace the full file:

```yaml
services:
  db:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    volumes:
      - phoenix_db:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 10

  phoenix:
    image: arizephoenix/phoenix:latest
    restart: always
    depends_on:
      db:
        condition: service_healthy
    ports:
      - '6006:6006'
      - '4317:4317'
    environment:
      PHOENIX_SQL_DATABASE_URL: postgresql://postgres:postgres@db:5432/postgres

  mcp-server:
    build:
      context: .
      dockerfile: apps/mcp-server/Dockerfile
      target: production
    depends_on:
      - phoenix
    ports:
      - '${MCP_PORT:-3300}:3300'
    environment:
      MCP_PORT: 3300
      INTERVALS_API_KEY: ${INTERVALS_API_KEY}
      INTERVALS_ATHLETE_ID: ${INTERVALS_ATHLETE_ID:-0}
      PHOENIX_COLLECTOR_ENDPOINT: http://phoenix:6006
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          'fetch("http://localhost:3300/health/ready").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))',
        ]
      interval: 10s
      timeout: 5s
      retries: 5

  agent:
    build:
      context: .
      dockerfile: apps/agent/Dockerfile
      target: production
    depends_on:
      phoenix:
        condition: service_started
      mcp-server:
        condition: service_healthy
    ports:
      - '${AGENT_PORT:-8787}:8787'
    environment:
      AGENT_PORT: 8787
      MCP_SERVER_URL: http://mcp-server:3300/mcp
      OLLAMA_BASE_URL: ${OLLAMA_BASE_URL:-http://host.docker.internal:11434}
      OLLAMA_MODEL: ${OLLAMA_MODEL:-gemma4:12b}
      PHOENIX_COLLECTOR_ENDPOINT: http://phoenix:6006
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          'fetch("http://localhost:8787/health/ready").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))',
        ]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  phoenix_db:
```

Note the removed comment block ("The MCP server is intentionally absent...") — it described the old stdio-only design and is no longer true.

- [ ] **Step 2: Validate the compose file parses and resolves**

Run: `docker compose config --quiet`
Expected: no output, exit code 0 (means the YAML is valid and all `${VAR}` references resolve, using whatever `.env` currently exists at repo root).

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(compose): add mcp-server service, wire agent to it over HTTP"
```

---

### Task 14: docker-compose.override.yml — dev hot reload

**Files:**
- Create: `docker-compose.override.yml`

**Interfaces:**
- Consumes: `dev` build targets from Tasks 4 and 12.
- Produces: auto-merged dev overrides — Compose applies this file automatically whenever both `docker-compose.yml` and `docker-compose.override.yml` are present in the working directory and no `-f` flag is passed.

- [ ] **Step 1: Write `docker-compose.override.yml`**

```yaml
services:
  mcp-server:
    build:
      target: dev
    environment:
      NODE_ENV: development
    volumes:
      - ./apps/mcp-server/src:/repo/apps/mcp-server/src
      - ./packages/instrumentation/src:/repo/packages/instrumentation/src

  agent:
    build:
      target: dev
    environment:
      NODE_ENV: development
    volumes:
      - ./apps/agent/src:/repo/apps/agent/src
      - ./packages/instrumentation/src:/repo/packages/instrumentation/src
```

- [ ] **Step 2: Verify the override merges automatically (no `-f` flags)**

Run: `docker compose config --quiet`
Expected: no output, exit code 0. Then run `docker compose config` (without `--quiet`) and confirm the rendered `mcp-server` and `agent` services show `target: dev` and the two bind-mount volumes each — that's the proof the override applied automatically.

- [ ] **Step 3: Verify preprod/prod invocation excludes the override**

Run: `docker compose -f docker-compose.yml config`
Expected: rendered services show `target: production` and no `volumes:` bind mounts — passing `-f` explicitly disables Compose's automatic override-file merging.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.override.yml
git commit -m "feat(compose): add dev-only hot reload override"
```

---

### Task 15: environment files for dev/preprod/prod tiers

**Files:**
- Modify: `.env.example`
- Create: `.env.preprod.example`
- Create: `.env.production.example`
- Modify: `.gitignore`
- Modify: `package.json` (root)

**Interfaces:**
- Produces: `docker:preprod` / `docker:prod` root scripts; documented variable list covering every service.

- [ ] **Step 1: Extend `.env.example` with the new variables**

Append to `.env.example` (after the existing `AGENT_PORT` line):

```
# Port the MCP server's Streamable HTTP endpoint listens on
MCP_PORT=3300

# Where the agent reaches the MCP server. Inside docker-compose this is the
# mcp-server service name; only override for local (non-Docker) runs.
MCP_SERVER_URL=http://mcp-server:3300/mcp

# Ollama connection for the agent's LLM. host.docker.internal reaches an
# Ollama instance running natively on the host machine from inside a
# container (Docker Desktop only; on native Linux Docker this needs an
# `extra_hosts` entry instead).
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=gemma4:12b
```

- [ ] **Step 2: Add `.env.preprod` and `.env.production` to `.gitignore`**

Modify `.gitignore` — add two lines next to the existing `.env` entry:

```
.env.preprod
.env.production
```

- [ ] **Step 3: Write `.env.preprod.example`**

Create `.env.preprod.example` (copy of `.env.example`'s full contents, with a header comment marking it as the preprod template):

```
# Preprod tier. Copy to .env.preprod and fill in real values.
# Never commit the filled-in .env.preprod file.

INTERVALS_API_KEY=
INTERVALS_ATHLETE_ID=0

PHOENIX_COLLECTOR_ENDPOINT=http://phoenix:6006

AGENT_PORT=8787
MCP_PORT=3300
MCP_SERVER_URL=http://mcp-server:3300/mcp

OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=gemma4:12b
```

- [ ] **Step 4: Write `.env.production.example`**

Create `.env.production.example` (identical shape, production header):

```
# Production tier. Copy to .env.production and fill in real values.
# Never commit the filled-in .env.production file.

INTERVALS_API_KEY=
INTERVALS_ATHLETE_ID=0

PHOENIX_COLLECTOR_ENDPOINT=http://phoenix:6006

AGENT_PORT=8787
MCP_PORT=3300
MCP_SERVER_URL=http://mcp-server:3300/mcp

OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=gemma4:12b
```

- [ ] **Step 5: Add root `docker:preprod`/`docker:prod` scripts**

Modify `package.json` (root) `scripts` block:

```json
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "eslint \"{apps,packages}/**/*.ts\" --fix",
    "format": "prettier --write \"{apps,packages}/**/*.ts\"",
    "docker:preprod": "docker compose -f docker-compose.yml --env-file .env.preprod up",
    "docker:prod": "docker compose -f docker-compose.yml --env-file .env.production up"
  },
```

The explicit `-f docker-compose.yml` is load-bearing: passing any `-f` flag disables Compose's automatic pickup of `docker-compose.override.yml`, which is exactly what preprod/prod need (no dev bind-mounts, no `dev` build target).

- [ ] **Step 6: Verify both invocations render correctly (without actually starting them)**

Run: `docker compose -f docker-compose.yml --env-file .env.preprod.example config --quiet`
Expected: exit code 0 (using the `.example` file here only to prove the mechanism works without needing real secrets filled in).

- [ ] **Step 7: Commit**

```bash
git add .env.example .env.preprod.example .env.production.example .gitignore package.json
git commit -m "feat(compose): add per-tier env files and docker:preprod/docker:prod scripts"
```

---

### Task 16: documentation updates

**Files:**
- Modify: `README.md`
- Modify: `intervals-mcp-blueprint.md`

**Interfaces:**
- None (docs only).

- [ ] **Step 1: Rewrite README.md's repo-structure line and "Running with Docker Compose" section**

Modify `README.md` — change line 7 from:

```
apps/mcp-server   NestJS MCP server over stdio (hexagonal architecture)
apps/agent        LangGraph agent — boilerplate only, no LLM wired up yet
```

to:

```
apps/mcp-server   NestJS MCP server, Streamable HTTP transport (hexagonal architecture)
apps/agent        NestJS LangGraph agent (hexagonal architecture), talks to mcp-server over HTTP
```

Replace the whole "## Running with Docker Compose" section (through the "Why the MCP server is not a compose service" paragraph) with:

```markdown
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
```

Replace the "## Running" section (the mcp-server stdio instructions) with:

```markdown
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
```

- [ ] **Step 2: Add a note to the blueprint's Phase 4 section**

Modify `intervals-mcp-blueprint.md` — after the Phase 4 bullet list (the line ending "Deploy somewhere with a public URL."), insert:

```markdown

> Streamable HTTP transport itself shipped early (see
> `docs/superpowers/specs/2026-09-19-mcp-streamable-http-and-agent-hexagonal-design.md`),
> running inside the docker-compose network / localhost only. Axis A/B
> auth and a public deployment remain open, as originally scoped here.
```

- [ ] **Step 3: Commit**

```bash
git add README.md intervals-mcp-blueprint.md
git commit -m "docs: update README and blueprint for Streamable HTTP transport"
```

---

## Final verification (run after all 16 tasks)

- [ ] Run: `pnpm turbo build` — expected: all workspace packages build in dependency order, no errors.
- [ ] Run: `pnpm turbo test` — expected: mcp-server, agent, and instrumentation suites all green.
- [ ] Run: `docker compose up --build` — expected: `db`, `phoenix`, `mcp-server`, `agent` all start; `docker compose ps` shows `mcp-server` and `agent` as `healthy`.
- [ ] Run: `curl -X POST localhost:8787/invoke -H 'content-type: application/json' -d '{"question":"hi"}'` — expected: a JSON `{"answer": "..."}` response (requires a real Ollama running on the host at the configured `OLLAMA_BASE_URL`), and the trace visible in Phoenix at http://localhost:6006 under both `intervals-agent` and `intervals-icu-mcp` projects.
- [ ] Run: `curl localhost:3300/health/ready`, `curl localhost:8787/health/ready`, `curl localhost:3300/metrics`, `curl localhost:8787/metrics` — expected: all four return 200 with the expected body shape.
- [ ] Edit a file under `apps/mcp-server/src` while `docker compose up` is running — expected: the `mcp-server` container recompiles and restarts without a manual `docker compose build`. Repeat for `apps/agent/src`.
- [ ] Run: `docker compose -f docker-compose.yml --env-file .env.preprod.example config` and the same with `.env.production.example` — expected: both render a valid configuration with `target: production` and no bind-mount volumes.

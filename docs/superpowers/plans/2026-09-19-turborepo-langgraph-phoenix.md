# Turborepo + LangGraph Agent + Phoenix Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-package repo into a Turborepo + pnpm-workspaces monorepo with a shared `@intervals/instrumentation` package, add a LangGraph app containing boilerplate only, and stand up one shared Arize Phoenix instance via Docker Compose that both apps trace into.

**Architecture:** The repo root becomes a private workspace root whose scripts delegate to `turbo`. Today's entire codebase moves under `apps/mcp-server` unchanged. The Phoenix/OTel bootstrap is extracted to `packages/instrumentation`, which exports a single `registerTelemetry({ projectName })`; each app keeps its own choice of which instrumentations to enable. A new `apps/agent` holds a compiled LangGraph `StateGraph` with one echo node behind a `node:http` endpoint — no LLM, no MCP wiring. `docker-compose.yml` runs Postgres, Phoenix and the agent. The MCP server is deliberately *not* a compose service: it speaks stdio and its lifecycle belongs to the client that spawns it, so it runs on the host and reaches the same Phoenix over the published port.

**Tech Stack:** Turborepo 2.11, pnpm 12 workspaces, TypeScript 5.7 (`nodenext`, strict, CommonJS output), NestJS 11 (mcp-server, unchanged), `@langchain/langgraph` 1.4 + `@langchain/core` 1.2 (agent), `@arizeai/phoenix-otel` 2.2, `@opentelemetry/api` 1.9, Jest 30 + ts-jest, Docker Compose, `arizephoenix/phoenix:latest`, `postgres:16`, `node:24-slim`.

**Spec:** `docs/superpowers/specs/2026-09-19-turborepo-langgraph-phoenix-design.md`

## Global Constraints

- Package manager is pnpm (12.4.1); test runner is Jest. Do not introduce npm/yarn lockfiles.
- TypeScript strict mode everywhere. `module` and `moduleResolution` stay `nodenext`. No package sets `"type": "module"` — output stays CommonJS.
- Workspace package names are scoped `@intervals/*`. Internal dependencies use `"workspace:*"`.
- All file moves use `git mv`, never delete-and-recreate, so history follows the files.
- The existing MCP server test suite is the regression net for the restructure: it must be green at the end of every task.
- `@modelcontextprotocol/sdk` types stay inside `apps/mcp-server/src/mcp/`.
- Dev-tooling dependencies are declared in each workspace package that runs them — pnpm does not hoist the root's binaries into a sub-package's `node_modules/.bin`.
- The Phoenix collector endpoint is configured only via the `PHOENIX_COLLECTOR_ENDPOINT` environment variable; never hardcode a URL in source.
- No real secrets committed. `.env` stays gitignored; `.env.example` documents every variable.
- Do not build anything listed under "Non-goals" in the spec — in particular no LLM calls, no MCP-to-agent wiring, and no LangChain auto-instrumentation.

---

## Task 1: Turborepo skeleton and move the MCP server into `apps/mcp-server`

Pure restructure. No behaviour changes. The deliverable is the same test suite passing from its new location, driven by turbo.

**Files:**
- Move: `src/` → `apps/mcp-server/src/`
- Move: `test/` → `apps/mcp-server/test/`
- Move: `fixtures/` → `apps/mcp-server/fixtures/`
- Move: `scripts/` → `apps/mcp-server/scripts/`
- Move: `nest-cli.json` → `apps/mcp-server/nest-cli.json`
- Move: `tsconfig.build.json` → `apps/mcp-server/tsconfig.build.json`
- Create: `apps/mcp-server/package.json`, `apps/mcp-server/tsconfig.json`
- Create: `packages/tsconfig/package.json`, `packages/tsconfig/base.json`
- Create: `turbo.json`
- Modify: `package.json` (becomes the workspace root)
- Modify: `pnpm-workspace.yaml`, `eslint.config.mjs`, `.gitignore`
- Delete: `tsconfig.json` at repo root (its content moves to `packages/tsconfig/base.json`)

**Interfaces:**
- Produces: workspace packages `@intervals/mcp-server` and `@intervals/tsconfig`; a root `pnpm turbo build` / `pnpm turbo test` that every later task extends.
- Produces: `@intervals/tsconfig/base.json`, the tsconfig base every other package extends.

- [ ] **Step 1: Record the baseline — the suite must already be green**

Run: `pnpm test`
Expected: PASS. Note the number of passing suites and tests; the same numbers must hold at the end of this task. If this is already failing, stop and fix that first — you cannot tell a move regression from a pre-existing failure otherwise.

- [ ] **Step 2: Move the MCP server's files with `git mv`**

Run:
```bash
mkdir -p apps/mcp-server packages/tsconfig
git mv src apps/mcp-server/src
git mv test apps/mcp-server/test
git mv fixtures apps/mcp-server/fixtures
git mv scripts apps/mcp-server/scripts
git mv nest-cli.json apps/mcp-server/nest-cli.json
git mv tsconfig.build.json apps/mcp-server/tsconfig.build.json
```

The contract tests read fixtures via `join(__dirname, '../../fixtures', name)` and `record-fixtures.ts` writes to `join(__dirname, '../fixtures/recorded')`. Because `test/`, `scripts/` and `fixtures/` move together into the same parent, every one of those relative paths still resolves. Do not edit them.

- [ ] **Step 3: Create the shared tsconfig package**

Create `packages/tsconfig/package.json`:
```json
{
  "name": "@intervals/tsconfig",
  "version": "0.0.0",
  "private": true,
  "license": "UNLICENSED",
  "files": ["base.json"],
  "exports": {
    "./base.json": "./base.json"
  }
}
```

Create `packages/tsconfig/base.json` — this is the old root `tsconfig.json` with `baseUrl` and `outDir` removed, because TypeScript resolves both relative to the file that declares them and leaving them here would point them inside `packages/tsconfig/`:
```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "resolvePackageJsonExports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": true,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["jest", "node"]
  }
}
```

Then delete the old root config: `git rm tsconfig.json`

- [ ] **Step 4: Create the MCP server's own tsconfig**

Create `apps/mcp-server/tsconfig.json`:
```json
{
  "extends": "@intervals/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": "./"
  }
}
```

`apps/mcp-server/tsconfig.build.json` already reads `{"extends": "./tsconfig.json", "exclude": [...]}` and needs no edit — verify that is still its content and leave it alone.

- [ ] **Step 5: Create the MCP server's package.json**

Create `apps/mcp-server/package.json`. This is the old root `package.json` with the name scoped, the root-only tooling removed, and the Jest `roots` unchanged (they were already `<rootDir>`-relative):
```json
{
  "name": "@intervals/mcp-server",
  "version": "0.0.1",
  "description": "MCP server exposing intervals.icu training data",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "fixtures:record": "ts-node scripts/record-fixtures.ts"
  },
  "dependencies": {
    "@arizeai/openinference-instrumentation-mcp": "0.2.33",
    "@arizeai/phoenix-otel": "2.2.0",
    "@modelcontextprotocol/sdk": "^1.30.0",
    "@nestjs/axios": "^4.0.1",
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.4",
    "@nestjs/core": "^11.0.1",
    "@opentelemetry/api": "1.9.1",
    "axios": "^1.20.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "zod": "^4.6.3"
  },
  "devDependencies": {
    "@intervals/tsconfig": "workspace:*",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.1",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "dotenv": "^17.4.2",
    "jest": "^30.0.0",
    "source-map-support": "^0.5.21",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "roots": ["<rootDir>/src", "<rootDir>/test"],
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "coverage",
    "testEnvironment": "node"
  }
}
```

Note `@arizeai/phoenix-otel` is still listed here — Task 2 removes it once the shared package owns it.

- [ ] **Step 6: Rewrite the root package.json as a workspace root**

Overwrite `package.json` at the repo root:
```json
{
  "name": "intervals-icu-monorepo",
  "version": "0.0.1",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "eslint \"{apps,packages}/**/*.ts\" --fix",
    "format": "prettier --write \"{apps,packages}/**/*.ts\""
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.2.0",
    "@eslint/js": "^9.18.0",
    "eslint": "^9.18.0",
    "eslint-config-prettier": "^10.0.1",
    "eslint-plugin-prettier": "^5.2.2",
    "globals": "^17.0.0",
    "prettier": "^3.4.2",
    "turbo": "^2.11.2",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.20.0"
  }
}
```

- [ ] **Step 7: Declare the workspaces**

Overwrite `pnpm-workspace.yaml`, keeping the existing `allowBuilds` and `minimumReleaseAgeExclude` entries verbatim — they exist because those packages need build scripts or are newer than the registry age gate, and dropping them breaks `pnpm install`:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'

allowBuilds:
  '@parcel/watcher': true
  unrs-resolver: true
minimumReleaseAgeExclude:
  - '@arizeai/openinference-core@2.7.1'
  - '@arizeai/openinference-instrumentation-mcp@0.2.33'
  - '@arizeai/openinference-semantic-conventions@2.12.0'
```

- [ ] **Step 8: Add the turbo pipeline**

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "start": {
      "dependsOn": ["build"],
      "cache": false,
      "persistent": true
    }
  }
}
```

`test` depends on `^build` so a package that consumes a built workspace dependency never tests against a stale `dist`.

- [ ] **Step 9: Update ESLint ignores for the new layout**

In `eslint.config.mjs`, replace the ignores entry:
```js
  {
    ignores: ['eslint.config.mjs', '**/dist/**', '**/coverage/**'],
  },
```
Everything else in that file stays exactly as it is. `projectService: true` resolves each file against its nearest `tsconfig.json`, which is now the per-app one, so no other change is needed.

- [ ] **Step 10: Update .gitignore for the moved fixtures**

In `.gitignore`, change the line `fixtures/recorded/` to:
```
apps/mcp-server/fixtures/recorded/
```
Leave `node_modules/`, `dist/`, `coverage/` and `.env` as they are — with no leading slash they already match at any depth.

- [ ] **Step 11: Install and verify the build**

Run:
```bash
pnpm install
pnpm turbo build
```
Expected: `pnpm install` links `@intervals/tsconfig` into `apps/mcp-server/node_modules`, and turbo reports 1 successful task (`@intervals/mcp-server#build`) producing `apps/mcp-server/dist/main.js`.

If `extends "@intervals/tsconfig/base.json"` fails to resolve, the cause is almost always a missing or misspelled `exports` entry in `packages/tsconfig/package.json` — re-check Step 3.

- [ ] **Step 12: Verify the suite is green from its new location**

Run: `pnpm turbo test`
Expected: PASS, with the same suite and test counts recorded in Step 1. A fixture-loading failure here means the Step 2 moves were not done as a single group — re-check that `test/`, `scripts/` and `fixtures/` all landed under `apps/mcp-server/`.

- [ ] **Step 13: Verify lint still passes**

Run: `pnpm lint`
Expected: exits 0.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "refactor: convert repo to turborepo monorepo with apps/mcp-server

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Extract the shared `@intervals/instrumentation` package

The worked example of a shared service. The MCP server stops calling `@arizeai/phoenix-otel` directly and goes through the package instead; the MCP-specific instrumentation stays in the app.

**Files:**
- Create: `packages/instrumentation/package.json`
- Create: `packages/instrumentation/tsconfig.json`
- Create: `packages/instrumentation/src/index.ts`
- Test: `packages/instrumentation/src/__tests__/index.spec.ts`
- Modify: `apps/mcp-server/src/instrumentation.ts` (whole file)
- Modify: `apps/mcp-server/package.json` (swap `@arizeai/phoenix-otel` for `@intervals/instrumentation`, add Jest `moduleNameMapper`)

**Interfaces:**
- Consumes: `@intervals/tsconfig/base.json` from Task 1.
- Produces: `registerTelemetry(options: TelemetryOptions): void` exported from `@intervals/instrumentation`, where `interface TelemetryOptions { projectName: string }`. Task 3's agent imports exactly this.

- [ ] **Step 1: Create the package manifest**

Create `packages/instrumentation/package.json`:
```json
{
  "name": "@intervals/instrumentation",
  "version": "0.0.0",
  "description": "Shared Phoenix/OpenTelemetry bootstrap for every app in the workspace",
  "private": true,
  "license": "UNLICENSED",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "@arizeai/phoenix-otel": "2.2.0"
  },
  "devDependencies": {
    "@intervals/tsconfig": "workspace:*",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "jest": "^30.0.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "roots": ["<rootDir>/src"],
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "testEnvironment": "node"
  }
}
```

Create `packages/instrumentation/tsconfig.json`:
```json
{
  "extends": "@intervals/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/__tests__/**"]
}
```

Run `pnpm install` so the new workspace package is linked before you write any code.

- [ ] **Step 2: Write the failing test**

Create `packages/instrumentation/src/__tests__/index.spec.ts`:
```ts
import { register } from '@arizeai/phoenix-otel';
import { registerTelemetry } from '../index';

jest.mock('@arizeai/phoenix-otel', () => ({
  register: jest.fn(),
}));

describe('registerTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers the Phoenix tracer provider under the given project name', () => {
    registerTelemetry({ projectName: 'intervals-icu-mcp' });

    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({
      projectName: 'intervals-icu-mcp',
    });
  });

  it('passes no endpoint, leaving PHOENIX_COLLECTOR_ENDPOINT to decide', () => {
    registerTelemetry({ projectName: 'intervals-agent' });

    const params = (register as jest.Mock).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(params).not.toHaveProperty('url');
  });
});
```

The second test pins the spec decision that the collector endpoint is configured only through the environment — it is what stops someone hardcoding `http://localhost:6006` and silently breaking the compose setup.

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @intervals/instrumentation test`
Expected: FAIL — `Cannot find module '../index'`.

- [ ] **Step 4: Write the minimal implementation**

Create `packages/instrumentation/src/index.ts`:
```ts
import { register } from '@arizeai/phoenix-otel';

export interface TelemetryOptions {
  /** Phoenix project the spans are grouped under, e.g. "intervals-icu-mcp". */
  projectName: string;
}

// Returns void rather than the NodeTracerProvider: no caller needs the
// provider, and naming it here would drag @opentelemetry/sdk-trace-node into
// this package's public types.
export function registerTelemetry(options: TelemetryOptions): void {
  register({ projectName: options.projectName });
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @intervals/instrumentation test`
Expected: PASS, 2 tests.

- [ ] **Step 6: Point the MCP server at the shared package**

In `apps/mcp-server/package.json`, in `dependencies`, replace the line
`"@arizeai/phoenix-otel": "2.2.0",` with
`"@intervals/instrumentation": "workspace:*",`
(keep the object alphabetically ordered — it sits directly after `@arizeai/openinference-instrumentation-mcp`).

In the same file, add `moduleNameMapper` to the `jest` block, directly after `"transform"`:
```json
    "moduleNameMapper": {
      "^@intervals/instrumentation$": "<rootDir>/../../packages/instrumentation/src/index.ts"
    },
```
This lets Jest resolve the workspace package from source, so tests do not require `packages/instrumentation` to have been built first.

Run: `pnpm install`

- [ ] **Step 7: Rewrite the MCP server's instrumentation entry**

Overwrite `apps/mcp-server/src/instrumentation.ts`:
```ts
import { registerTelemetry } from '@intervals/instrumentation';
import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';

// Must run before the MCP SDK is imported so the instrumentation can patch it.
// `main.ts` therefore imports this file first, before anything else.
registerTelemetry({ projectName: 'intervals-icu-mcp' });

new MCPInstrumentation().enable();
```

Do not touch `apps/mcp-server/src/main.ts` — its `import './instrumentation';` first line is what preserves the ordering guarantee.

- [ ] **Step 8: Verify the whole workspace builds and tests green**

Run:
```bash
pnpm turbo build
pnpm turbo test
```
Expected: 2 build tasks succeed (`@intervals/instrumentation#build` runs first because `@intervals/mcp-server` depends on it), and every suite passes — the MCP server counts from Task 1 Step 1, plus 2 new tests.

- [ ] **Step 9: Verify the server still boots and emits traces**

Run: `pnpm --filter @intervals/mcp-server start:prod`
Expected: the process starts and stays running with nothing written to stdout (stdout is reserved for the MCP protocol). Press Ctrl-C to stop. A crash here means the `registerTelemetry` call is no longer ordered before the MCP SDK import — re-check Step 7.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: extract shared @intervals/instrumentation package

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: LangGraph agent boilerplate app

Boilerplate only, per the spec's non-goals: a compiled graph with one echo node, an instrumented entry point, and an HTTP surface. No LLM provider, no MCP client, no checkpointer.

**Files:**
- Create: `apps/agent/package.json`, `apps/agent/tsconfig.json`
- Create: `apps/agent/src/graph.ts`, `apps/agent/src/run.ts`, `apps/agent/src/server.ts`, `apps/agent/src/main.ts`, `apps/agent/src/instrumentation.ts`
- Test: `apps/agent/src/__tests__/graph.spec.ts`, `apps/agent/src/__tests__/run.spec.ts`

**Interfaces:**
- Consumes: `registerTelemetry({ projectName: string }): void` from `@intervals/instrumentation` (Task 2); `@intervals/tsconfig/base.json` (Task 1).
- Produces: `buildGraph()` returning a compiled LangGraph; `runAgent(question: string): Promise<AgentResult>` where `interface AgentResult { answer: string }`; `startAgentServer(): void` listening on `AGENT_PORT` (default `8787`) with `GET /health` and `POST /invoke`. Task 4's Dockerfile runs `apps/agent/dist/main.js` and its compose healthcheck hits `/health`.

- [ ] **Step 1: Create the package manifest and tsconfig**

Create `apps/agent/package.json`:
```json
{
  "name": "@intervals/agent",
  "version": "0.0.1",
  "description": "LangGraph agent boilerplate",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "test": "jest --passWithNoTests"
  },
  "dependencies": {
    "@intervals/instrumentation": "workspace:*",
    "@langchain/core": "^1.2.11",
    "@langchain/langgraph": "^1.4.16",
    "@opentelemetry/api": "1.9.1"
  },
  "devDependencies": {
    "@intervals/tsconfig": "workspace:*",
    "@types/jest": "^30.0.0",
    "@types/node": "^24.0.0",
    "jest": "^30.0.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "roots": ["<rootDir>/src"],
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "moduleNameMapper": {
      "^@intervals/instrumentation$": "<rootDir>/../../packages/instrumentation/src/index.ts"
    },
    "testEnvironment": "node"
  }
}
```

Create `apps/agent/tsconfig.json`. Note `"declaration": false` — this is an application, not a library, and emitting declarations would force TypeScript to name LangGraph's deeply generic compiled-graph type:
```json
{
  "extends": "@intervals/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": false
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/__tests__/**"]
}
```

Run: `pnpm install`

- [ ] **Step 2: Write the failing graph test**

Create `apps/agent/src/__tests__/graph.spec.ts`:
```ts
import { buildGraph } from '../graph';

describe('agent graph', () => {
  it('runs the echo node and puts its output on the answer channel', async () => {
    const graph = buildGraph();

    const result = await graph.invoke({ question: 'how is my form?' });

    expect(result.answer).toBe('received: how is my form?');
  });

  it('leaves the question channel untouched', async () => {
    const graph = buildGraph();

    const result = await graph.invoke({ question: 'what is on my plan?' });

    expect(result.question).toBe('what is on my plan?');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm --filter @intervals/agent test`
Expected: FAIL — `Cannot find module '../graph'`.

- [ ] **Step 4: Implement the graph**

Create `apps/agent/src/graph.ts`:
```ts
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

export const AgentState = Annotation.Root({
  question: Annotation<string>,
  answer: Annotation<string>,
});

export type AgentStateType = typeof AgentState.State;

export function buildGraph() {
  return new StateGraph(AgentState)
    .addNode('echo', (state: AgentStateType) => ({
      answer: `received: ${state.question}`,
    }))
    .addEdge(START, 'echo')
    .addEdge('echo', END)
    .compile();
}
```

The builder is chained in one expression on purpose: `StateGraph`'s types only know `'echo'` is a valid edge target if `addNode` and `addEdge` are called on the same fluent chain.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm --filter @intervals/agent test`
Expected: PASS, 2 tests.

- [ ] **Step 6: Write the failing test for the instrumented entry point**

Create `apps/agent/src/__tests__/run.spec.ts`:
```ts
import { runAgent } from '../run';

describe('runAgent', () => {
  it('returns the graph answer for a question', async () => {
    await expect(runAgent('how is my form?')).resolves.toEqual({
      answer: 'received: how is my form?',
    });
  });

  it('handles an empty question without throwing', async () => {
    await expect(runAgent('')).resolves.toEqual({ answer: 'received: ' });
  });
});
```

No OpenTelemetry setup is needed: with no registered provider, `trace.getTracer` returns a no-op tracer and spans are free.

- [ ] **Step 7: Run the test to verify it fails**

Run: `pnpm --filter @intervals/agent test`
Expected: FAIL — `Cannot find module '../run'`.

- [ ] **Step 8: Implement the instrumented entry point**

Create `apps/agent/src/run.ts`:
```ts
import { trace } from '@opentelemetry/api';
import { buildGraph } from './graph';

const tracer = trace.getTracer('@intervals/agent');
const graph = buildGraph();

export interface AgentResult {
  answer: string;
}

export async function runAgent(question: string): Promise<AgentResult> {
  return tracer.startActiveSpan('agent.invoke', async (span) => {
    try {
      span.setAttribute('agent.question.length', question.length);
      const state = await graph.invoke({ question });
      return { answer: state.answer };
    } finally {
      span.end();
    }
  });
}
```

The question itself is deliberately not set as a span attribute — only its length. Free text goes to Phoenix only once the redaction helper described in the spec exists.

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm --filter @intervals/agent test`
Expected: PASS, 4 tests.

- [ ] **Step 10: Add the HTTP surface and the process entry point**

Create `apps/agent/src/server.ts`:
```ts
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { runAgent } from './run';

const DEFAULT_PORT = 8787;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function handleInvoke(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const raw = await readBody(req);

  let question: unknown;
  try {
    question = (JSON.parse(raw) as { question?: unknown }).question;
  } catch {
    sendJson(res, 400, { error: 'body must be valid JSON' });
    return;
  }

  if (typeof question !== 'string') {
    sendJson(res, 400, { error: 'body must be {"question": string}' });
    return;
  }

  sendJson(res, 200, await runAgent(question));
}

export function startAgentServer(): void {
  const port = Number(process.env.AGENT_PORT ?? DEFAULT_PORT);

  const server = createServer((req, res) => {
    void (async () => {
      if (req.method === 'GET' && req.url === '/health') {
        sendJson(res, 200, { status: 'ok' });
        return;
      }
      if (req.method === 'POST' && req.url === '/invoke') {
        await handleInvoke(req, res);
        return;
      }
      sendJson(res, 404, { error: 'not found' });
    })().catch(() => sendJson(res, 500, { error: 'internal error' }));
  });

  server.listen(port, () => {
    console.log(`agent listening on :${port}`);
  });
}
```

Create `apps/agent/src/instrumentation.ts`:
```ts
import { registerTelemetry } from '@intervals/instrumentation';

registerTelemetry({ projectName: 'intervals-agent' });
```

Create `apps/agent/src/main.ts`:
```ts
import './instrumentation';
import { startAgentServer } from './server';

startAgentServer();
```

- [ ] **Step 11: Verify the build and run the agent end to end**

Run:
```bash
pnpm turbo build
pnpm --filter @intervals/agent start
```
Expected: `agent listening on :8787`.

In a second shell:
```bash
curl -s localhost:8787/health
curl -s -X POST localhost:8787/invoke -H 'content-type: application/json' -d '{"question":"how is my form?"}'
curl -s -X POST localhost:8787/invoke -H 'content-type: application/json' -d '{"nope":1}'
```
Expected, in order: `{"status":"ok"}`, `{"answer":"received: how is my form?"}`, `{"error":"body must be {\"question\": string}"}`.

Stop the agent with Ctrl-C. Phoenix is not running yet, so the exporter will log a connection failure — that is expected and is fixed in Task 4.

- [ ] **Step 12: Verify the whole workspace is green**

Run:
```bash
pnpm turbo test
pnpm lint
```
Expected: all suites pass, lint exits 0.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add LangGraph agent boilerplate app

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Docker Compose — Phoenix, Postgres, and the agent

The MCP server gets no Dockerfile and no compose service. A stdio MCP
server is spawned as a subprocess by its client and dies with it;
running it as a long-lived container would idle forever, do no work and
emit no traces while looking like a healthy service. It runs on the
host instead and traces into the same Phoenix over the published port.

**Files:**
- Create: `docker-compose.yml`, `.dockerignore`
- Create: `apps/agent/Dockerfile`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: `apps/agent/dist/main.js` from Task 3; `GET /health` on the agent (Task 3) for the compose healthcheck.
- Produces: `docker compose up --build` serving Phoenix on `localhost:6006` and the agent on `localhost:8787`.

- [ ] **Step 1: Add the Docker ignore file**

Create `.dockerignore`. Without this, the build context ships the host's `node_modules` — gigabytes of the wrong platform's binaries:
```
.git
node_modules
**/node_modules
**/dist
**/coverage
.turbo
**/.turbo
.env
.env.phoenix
.worktrees
```

- [ ] **Step 2: Add the agent Dockerfile**

The image copies the whole workspace and builds inside the container. That is deliberate for a dev-loop image: a `turbo prune`-based multi-stage build is faster but adds a failure mode that has nothing to do with what this task is proving.

Create `apps/agent/Dockerfile`:
```dockerfile
FROM node:24-slim

WORKDIR /repo
RUN npm install -g pnpm@12.4.1

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter @intervals/agent

ENV AGENT_PORT=8787
EXPOSE 8787
CMD ["node", "apps/agent/dist/main.js"]
```

Do not create `apps/mcp-server/Dockerfile` — see the note at the top of this task.

- [ ] **Step 3: Add the compose file**

Create `docker-compose.yml`. Port and environment-variable choices follow the Arize self-hosting Docker docs: 6006 is the UI and the OTLP HTTP collector, 4317 is OTLP gRPC, and `PHOENIX_SQL_DATABASE_URL` switches Phoenix from SQLite to Postgres:
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

  agent:
    build:
      context: .
      dockerfile: apps/agent/Dockerfile
    depends_on:
      - phoenix
    ports:
      - '8787:8787'
    environment:
      AGENT_PORT: 8787
      PHOENIX_COLLECTOR_ENDPOINT: http://phoenix:6006
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          'fetch("http://localhost:8787/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))',
        ]
      interval: 10s
      timeout: 5s
      retries: 5

# The MCP server is intentionally absent. It speaks stdio and is spawned as a
# subprocess by its client (Claude Desktop / Claude Code), so it runs on the
# host and traces into this Phoenix via the published port 6006. See README.

volumes:
  phoenix_db:
```

- [ ] **Step 4: Document the new environment variables**

Overwrite `.env.example`:
```
# Personal API key from https://intervals.icu -> Settings -> Developer
INTERVALS_API_KEY=
# Athlete id; "0" resolves to the key's own athlete and is almost always correct
INTERVALS_ATHLETE_ID=0

# Where OpenTelemetry spans are sent. http://localhost:6006 is correct for an
# app run on the host (the MCP server) against the Phoenix published by
# docker-compose. The agent container overrides this to http://phoenix:6006,
# its service name on the compose network.
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006

# Port the LangGraph agent's HTTP surface listens on
AGENT_PORT=8787
```

- [ ] **Step 5: Bring the stack up and verify traces reach Phoenix**

Run: `docker compose up --build`
Expected: three services start; `db` becomes healthy first, then `phoenix`, then `agent` logs `agent listening on :8787`.

In a second shell:
```bash
curl -s -X POST localhost:8787/invoke -H 'content-type: application/json' -d '{"question":"how is my form?"}'
```
Expected: `{"answer":"received: how is my form?"}`.

Open `http://localhost:6006` and select the `intervals-agent` project. Expected: an `agent.invoke` span, with an `agent.question.length` attribute of 16. Spans are batched, so allow a few seconds.

If the span never appears, check the agent container's logs for an exporter connection error — that means `PHOENIX_COLLECTOR_ENDPOINT` is not reaching the process, not that the graph failed.

- [ ] **Step 6: Verify persistence across a restart**

Run:
```bash
docker compose restart phoenix
```
Wait for Phoenix to come back, reload `http://localhost:6006`.
Expected: the `agent.invoke` span from Step 5 is still listed — that is the `phoenix_db` volume doing its job.

- [ ] **Step 7: Verify the host-run MCP server reaches the same Phoenix**

This is the step that proves dropping the `mcp-server` compose service cost nothing. Leave the stack up from Step 5.

Run, on the host:
```bash
PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006 pnpm --filter @intervals/mcp-server start:prod
```
Expected: the process starts and stays running, writing nothing to stdout.

Open `http://localhost:6006`. Expected: two projects are now listed, `intervals-agent` and `intervals-icu-mcp` — one Phoenix, both apps, which is what "running them together" needed to mean.

The MCP server emits tool spans only when a client drives it, so the `intervals-icu-mcp` project will be empty until one does. That is the point: its work is client-driven, which is exactly why it is not a compose service.

Stop it with Ctrl-C, then: `docker compose down`

- [ ] **Step 8: Update the README**

In `README.md`, replace the section from the `# intervals-icu-mcp` heading down to (and including) the `## Setup` section with:

````markdown
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
````

Leave the rest of `README.md` (the `## Running` section onward) in place, but update the two commands it names to `pnpm --filter @intervals/mcp-server start` and `pnpm --filter @intervals/mcp-server start:prod`, and the compiled path to `apps/mcp-server/dist/main.js`.

- [ ] **Step 9: Final verification of the whole workspace**

Run:
```bash
pnpm turbo build
pnpm turbo test
pnpm lint
```
Expected: 3 build tasks succeed, all suites pass, lint exits 0.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add docker compose stack with Phoenix and the agent

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-review notes

**Spec coverage.** Monorepo conversion → Task 1. Shared instrumentation package → Task 2. LangGraph boilerplate app → Task 3. Compose with Phoenix + the agent, and the host-run MCP server tracing into the same Phoenix → Task 4. Every spec non-goal is absent from the tasks, and the Global Constraints repeat the ban.

**Type consistency.** `registerTelemetry(options: TelemetryOptions): void` is defined in Task 2 Step 4 and consumed identically in Task 2 Step 7 and Task 3 Step 10. `buildGraph()` (Task 3 Step 4) is consumed in Task 3 Step 8. `runAgent(question: string): Promise<AgentResult>` (Task 3 Step 8) is consumed in Task 3 Step 10. `startAgentServer(): void` (Task 3 Step 10) is consumed by `main.ts` in the same step and by the Task 4 Dockerfile's `CMD`. `AGENT_PORT` / `8787` and `PHOENIX_COLLECTOR_ENDPOINT` match across `server.ts`, the agent Dockerfile, `docker-compose.yml` and `.env.example`. `@intervals/tsconfig/base.json` is created in Task 1 Step 3 and extended by three tsconfigs with the same specifier.

**Known risk.** `@langchain/langgraph` 1.4's `Annotation.Root` API is used rather than its Zod-schema state API, because this repo is on Zod 4 and LangGraph's Zod integration targets Zod 3. If Task 3 Step 5 fails on a LangGraph API change, fix it against the installed package's types — do not switch the state definition to Zod.

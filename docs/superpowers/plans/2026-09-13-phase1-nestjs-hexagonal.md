# Phase 1 NestJS Hexagonal Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a local, stdio-only MCP server exposing intervals.icu training data to Claude Code, built with NestJS as the DI container in a hexagonal (domain / application / infrastructure / mcp) layout, with 6 tools, zod-validated contracts, and fixture-backed contract tests.

**Architecture:** Ports (`IntervalsPort`, `ClockPort`) are abstract classes used directly as Nest DI tokens. `InfrastructureModule` binds concrete adapters to those tokens. `ApplicationModule` provides the 6 use-cases, each depending only on ports. `McpModule` provides the 6 tool classes, each depending only on its use-case. `main.ts` boots a headless Nest application context, pulls the tool providers out of it, and connects them to an `@modelcontextprotocol/sdk` `McpServer` over stdio — Nest is a DI container here, nothing about MCP transport leaks outside `src/mcp/`.

**Tech Stack:** NestJS 10 (`@nestjs/core`, `@nestjs/common`, `@nestjs/config`, `@nestjs/axios`), `@modelcontextprotocol/sdk`, `zod`, `axios`, TypeScript strict mode, Jest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-13-phase1-nestjs-hexagonal-design.md`

## Global Constraints

- Package manager is pnpm; test runner is Jest (Nest CLI default) — do not introduce npm/yarn lockfiles.
- TypeScript strict mode on for the whole project.
- Read-only tools only — no write/mutating calls to intervals.icu in Phase 1.
- No Nest imports in `src/domain/` or in `src/application/` types themselves (use-cases are `@Injectable()`, but the domain models and port *interfaces* they reference must stay plain TypeScript).
- `@modelcontextprotocol/sdk` types must not appear outside `src/mcp/`.
- Every response-shaping use-case caps output and reports `truncated`/`shown`/`total` on overflow (blueprint §4 rule 3) — never silently truncate.
- HTTP Basic auth to intervals.icu: username literal `"API_KEY"`, password = the key from `INTERVALS_API_KEY`. Athlete id defaults to `"0"` (resolves to the token's own athlete) from `INTERVALS_ATHLETE_ID`.
- No real secrets committed. `.env` is gitignored; `.env.example` documents the two vars.

---

## Task 1: Scaffold NestJS project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `.eslintrc.js`, `.prettierrc`, `.gitignore`
- Create: `src/main.ts` (temporary stub, replaced in Task 18)
- Create: `src/app.module.ts` (empty root module, filled in Task 18)
- Delete (if generated): `src/app.controller.ts`, `src/app.service.ts`, `src/app.controller.spec.ts` — this project has no HTTP controllers

**Interfaces:**
- Produces: a working `pnpm install`, `pnpm test`, `pnpm build` pipeline that later tasks build on.

- [ ] **Step 1: Scaffold with Nest CLI**

Run:
```bash
pnpm dlx @nestjs/cli new . --package-manager pnpm --skip-git --language ts
```
When prompted about a non-empty directory, confirm proceeding (the blueprint doc and spec/plan under `docs/` already exist and should be kept).

- [ ] **Step 2: Remove default HTTP scaffolding**

Delete `src/app.controller.ts`, `src/app.controller.spec.ts`, `src/app.service.ts` (Nest's default "Hello World" REST scaffolding — this project has no HTTP inbound adapter in Phase 1).

- [ ] **Step 3: Empty the root module**

Edit `src/app.module.ts` to:
```ts
import { Module } from '@nestjs/common';

@Module({
  imports: [],
})
export class AppModule {}
```

- [ ] **Step 4: Stub main.ts**

Edit `src/main.ts` to:
```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(AppModule);
}

bootstrap();
```

- [ ] **Step 5: Enable TypeScript strict mode**

Edit `tsconfig.json` so `compilerOptions` includes:
```json
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true,
"noUnusedLocals": true,
"noUnusedParameters": true
```

- [ ] **Step 6: Install additional dependencies**

Run:
```bash
pnpm add @nestjs/config @nestjs/axios axios zod @modelcontextprotocol/sdk
pnpm add -D ts-node
```

- [ ] **Step 7: Verify the pipeline works**

Run: `pnpm build && pnpm test`
Expected: build succeeds, Jest reports "No tests found" (no test files yet) without erroring.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Scaffold NestJS project, remove default HTTP boilerplate

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 2: Domain layer

**Files:**
- Create: `src/domain/date-range.ts`
- Create: `src/domain/date-range.spec.ts`
- Create: `src/domain/activity.ts`
- Create: `src/domain/wellness.ts`
- Create: `src/domain/planned-workout.ts`

**Interfaces:**
- Produces: `DateRange` (class, `DateRange.of(from: Date, to: Date): DateRange`, readonly `from`/`to`), `Activity`, `ActivityId`, `ActivityDetail`, `ActivityInterval`, `HrZoneDistribution`, `TrainingLoad`, `Wellness`, `PlannedWorkout` — all plain TypeScript, no framework imports. Every later task that touches domain data uses these exact shapes.

- [ ] **Step 1: Write the failing test for DateRange**

```ts
// src/domain/date-range.spec.ts
import { DateRange } from './date-range';

describe('DateRange', () => {
  it('accepts from <= to', () => {
    const range = DateRange.of(new Date('2026-01-01'), new Date('2026-01-31'));
    expect(range.from).toEqual(new Date('2026-01-01'));
    expect(range.to).toEqual(new Date('2026-01-31'));
  });

  it('accepts from === to', () => {
    const day = new Date('2026-01-01');
    const range = DateRange.of(day, day);
    expect(range.from).toEqual(day);
  });

  it('rejects from > to', () => {
    expect(() => DateRange.of(new Date('2026-02-01'), new Date('2026-01-01'))).toThrow(
      /must be <=/,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test date-range`
Expected: FAIL — `Cannot find module './date-range'`

- [ ] **Step 3: Implement DateRange**

```ts
// src/domain/date-range.ts
export class DateRange {
  private constructor(
    readonly from: Date,
    readonly to: Date,
  ) {}

  static of(from: Date, to: Date): DateRange {
    if (from.getTime() > to.getTime()) {
      throw new Error(
        `DateRange: from (${from.toISOString()}) must be <= to (${to.toISOString()})`,
      );
    }
    return new DateRange(from, to);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test date-range`
Expected: PASS (3 tests)

- [ ] **Step 5: Add remaining domain types (no logic, no tests needed for plain shapes)**

```ts
// src/domain/activity.ts
export type ActivityId = string;

export interface Activity {
  id: ActivityId;
  date: string;
  name: string;
  sport: string;
  distanceMeters: number;
  durationSeconds: number;
  avgHeartRate: number | null;
  avgPace: number | null;
  trainingLoad: number | null;
}

export interface ActivityInterval {
  label: string;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  avgPower: number | null;
}

export interface HrZoneDistribution {
  zone1Seconds: number;
  zone2Seconds: number;
  zone3Seconds: number;
  zone4Seconds: number;
  zone5Seconds: number;
}

export interface ActivityDetail extends Activity {
  intervals: ActivityInterval[];
  hrZoneDistribution: HrZoneDistribution;
}

export interface TrainingLoad {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}
```

```ts
// src/domain/wellness.ts
export interface Wellness {
  date: string;
  hrv: number | null;
  restingHeartRate: number | null;
  sleepHours: number | null;
  weightKg: number | null;
  fatigue: number | null;
}
```

```ts
// src/domain/planned-workout.ts
export interface PlannedWorkout {
  id: string;
  date: string;
  name: string;
  sport: string;
  description: string | null;
  plannedDurationSeconds: number | null;
  plannedDistanceMeters: number | null;
}
```

- [ ] **Step 6: Run full test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/domain
git commit -m "Add domain layer: DateRange value object and entity shapes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 3: Application ports and ApplicationModule shell

**Files:**
- Create: `src/application/ports/intervals.port.ts`
- Create: `src/application/ports/clock.port.ts`
- Create: `src/application/application.module.ts`

**Interfaces:**
- Consumes: `DateRange`, `Activity`, `ActivityDetail`, `TrainingLoad`, `Wellness`, `PlannedWorkout` from Task 2.
- Produces: `IntervalsPort` (abstract class, methods below), `ClockPort` (abstract class, `now(): Date`), empty `ApplicationModule` that later tasks add providers to.

- [ ] **Step 1: Define IntervalsPort**

```ts
// src/application/ports/intervals.port.ts
import { DateRange } from '../../domain/date-range';
import { Activity, ActivityDetail, TrainingLoad } from '../../domain/activity';
import { Wellness } from '../../domain/wellness';
import { PlannedWorkout } from '../../domain/planned-workout';

export abstract class IntervalsPort {
  abstract getActivities(range: DateRange, sport?: string): Promise<Activity[]>;
  abstract getActivityDetail(activityId: string): Promise<ActivityDetail>;
  abstract getWellness(range: DateRange): Promise<Wellness[]>;
  abstract getPlannedWorkouts(range: DateRange): Promise<PlannedWorkout[]>;
  abstract getTrainingLoad(range: DateRange): Promise<TrainingLoad[]>;
}
```

- [ ] **Step 2: Define ClockPort**

```ts
// src/application/ports/clock.port.ts
export abstract class ClockPort {
  abstract now(): Date;
}
```

- [ ] **Step 3: Create the ApplicationModule shell**

```ts
// src/application/application.module.ts
import { Module } from '@nestjs/common';

@Module({
  providers: [],
  exports: [],
})
export class ApplicationModule {}
```

- [ ] **Step 4: Verify the project still builds**

Run: `pnpm build`
Expected: succeeds (ports are unused abstract classes at this point, which is fine)

- [ ] **Step 5: Commit**

```bash
git add src/application
git commit -m "Add IntervalsPort and ClockPort, empty ApplicationModule shell

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 4: SystemClockAdapter

**Files:**
- Create: `src/infrastructure/clock/system-clock.adapter.ts`
- Create: `src/infrastructure/clock/system-clock.adapter.spec.ts`

**Interfaces:**
- Consumes: `ClockPort` from Task 3.
- Produces: `SystemClockAdapter` (`@Injectable()`, `extends ClockPort`, `now(): Date`) — later bound to `ClockPort` in `InfrastructureModule` (Task 9).

- [ ] **Step 1: Write the failing test**

```ts
// src/infrastructure/clock/system-clock.adapter.spec.ts
import { SystemClockAdapter } from './system-clock.adapter';

describe('SystemClockAdapter', () => {
  it('returns the current time', () => {
    const before = Date.now();
    const clock = new SystemClockAdapter();
    const now = clock.now().getTime();
    const after = Date.now();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test system-clock`
Expected: FAIL — `Cannot find module './system-clock.adapter'`

- [ ] **Step 3: Implement**

```ts
// src/infrastructure/clock/system-clock.adapter.ts
import { Injectable } from '@nestjs/common';
import { ClockPort } from '../../application/ports/clock.port';

@Injectable()
export class SystemClockAdapter extends ClockPort {
  now(): Date {
    return new Date();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test system-clock`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/clock
git commit -m "Add SystemClockAdapter

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 5: ApiKeyCredentialProvider, env config, .gitignore

**Files:**
- Create: `src/infrastructure/auth/api-key.credential-provider.ts`
- Create: `src/infrastructure/auth/api-key.credential-provider.spec.ts`
- Create: `.env.example`
- Modify: `.gitignore` (ensure `.env` is present)

**Interfaces:**
- Produces: `ApiKeyCredentialProvider` (`@Injectable()`, `getApiKey(): string` — throws if `INTERVALS_API_KEY` unset, `getAthleteId(): string` — defaults to `"0"`). Used by `IntervalsHttpAdapter` in Task 9.

- [ ] **Step 1: Write the failing tests**

```ts
// src/infrastructure/auth/api-key.credential-provider.spec.ts
import { ConfigService } from '@nestjs/config';
import { ApiKeyCredentialProvider } from './api-key.credential-provider';

function makeConfig(values: Record<string, string>): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

describe('ApiKeyCredentialProvider', () => {
  it('returns the configured API key', () => {
    const provider = new ApiKeyCredentialProvider(makeConfig({ INTERVALS_API_KEY: 'secret123' }));
    expect(provider.getApiKey()).toBe('secret123');
  });

  it('throws when the API key is missing', () => {
    const provider = new ApiKeyCredentialProvider(makeConfig({}));
    expect(() => provider.getApiKey()).toThrow(/INTERVALS_API_KEY/);
  });

  it('defaults athlete id to "0"', () => {
    const provider = new ApiKeyCredentialProvider(makeConfig({ INTERVALS_API_KEY: 'x' }));
    expect(provider.getAthleteId()).toBe('0');
  });

  it('returns a configured athlete id', () => {
    const provider = new ApiKeyCredentialProvider(
      makeConfig({ INTERVALS_API_KEY: 'x', INTERVALS_ATHLETE_ID: 'i12345' }),
    );
    expect(provider.getAthleteId()).toBe('i12345');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test api-key.credential-provider`
Expected: FAIL — `Cannot find module './api-key.credential-provider'`

- [ ] **Step 3: Implement**

```ts
// src/infrastructure/auth/api-key.credential-provider.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyCredentialProvider {
  constructor(private readonly config: ConfigService) {}

  getApiKey(): string {
    const key = this.config.get<string>('INTERVALS_API_KEY');
    if (!key) {
      throw new Error(
        'INTERVALS_API_KEY is not set. Copy .env.example to .env and fill in your intervals.icu personal API key.',
      );
    }
    return key;
  }

  getAthleteId(): string {
    return this.config.get<string>('INTERVALS_ATHLETE_ID') ?? '0';
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test api-key.credential-provider`
Expected: PASS (4 tests)

- [ ] **Step 5: Add .env.example and .gitignore entry**

```
# .env.example
# Personal API key from https://intervals.icu -> Settings -> Developer
INTERVALS_API_KEY=
# Athlete id; "0" resolves to the key's own athlete and is almost always correct
INTERVALS_ATHLETE_ID=0
```

Confirm `.gitignore` contains a `.env` line (Nest's generated `.gitignore` already does; add it if missing).

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/auth .env.example .gitignore
git commit -m "Add ApiKeyCredentialProvider and .env.example

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 6: Activities schemas, mappers, fixtures, contract tests

**Files:**
- Create: `src/infrastructure/intervals/schemas.ts`
- Create: `src/infrastructure/intervals/mappers.ts`
- Create: `fixtures/activities.json`
- Create: `fixtures/activity-detail.json`
- Create: `test/intervals/activities.contract.spec.ts`

**Interfaces:**
- Consumes: `Activity`, `ActivityDetail` from Task 2.
- Produces: `activitySchema`, `activitiesResponseSchema`, `activityDetailSchema` (zod), `toActivity(api): Activity`, `toActivityDetail(api): ActivityDetail` — reused unmodified by `IntervalsHttpAdapter` in Task 9.

- [ ] **Step 1: Write the failing contract test**

```ts
// test/intervals/activities.contract.spec.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { activitiesResponseSchema, activityDetailSchema } from '../../src/infrastructure/intervals/schemas';
import { toActivity, toActivityDetail } from '../../src/infrastructure/intervals/mappers';

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(__dirname, '../../fixtures', name), 'utf-8'));
}

describe('intervals.icu activities contract', () => {
  it('parses and maps the activities list fixture', () => {
    const parsed = activitiesResponseSchema.parse(loadFixture('activities.json'));
    const activities = parsed.map(toActivity);
    expect(activities).toHaveLength(1);
    expect(activities[0]).toMatchObject({
      id: 'i12345',
      sport: 'Ride',
      distanceMeters: 42000,
    });
  });

  it('parses and maps the activity detail fixture', () => {
    const parsed = activityDetailSchema.parse(loadFixture('activity-detail.json'));
    const detail = toActivityDetail(parsed);
    expect(detail.intervals).toHaveLength(2);
    expect(detail.hrZoneDistribution.zone2Seconds).toBe(900);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test activities.contract`
Expected: FAIL — modules and fixtures don't exist yet

- [ ] **Step 3: Add fixtures**

```json
// fixtures/activities.json
[
  {
    "id": "i12345",
    "start_date_local": "2026-09-01T07:15:00",
    "name": "Morning Ride",
    "type": "Ride",
    "distance": 42000,
    "moving_time": 5400,
    "icu_average_hr": 142,
    "icu_pace": 128.5,
    "icu_training_load": 65
  }
]
```

```json
// fixtures/activity-detail.json
{
  "id": "i12345",
  "start_date_local": "2026-09-01T07:15:00",
  "name": "Morning Ride",
  "type": "Ride",
  "distance": 42000,
  "moving_time": 5400,
  "icu_average_hr": 142,
  "icu_pace": 128.5,
  "icu_training_load": 65,
  "intervals": [
    {
      "label": "Warmup",
      "duration": 600,
      "distance": 3000,
      "average_heartrate": 118,
      "average_watts": 150
    },
    {
      "label": "Main set",
      "duration": 1800,
      "distance": 14000,
      "average_heartrate": 158,
      "average_watts": 220
    }
  ],
  "hr_zone_distribution": {
    "z1_secs": 600,
    "z2_secs": 900,
    "z3_secs": 1800,
    "z4_secs": 1500,
    "z5_secs": 600
  }
}
```

- [ ] **Step 4: Implement schemas**

```ts
// src/infrastructure/intervals/schemas.ts
import { z } from 'zod';

export const activitySchema = z.object({
  id: z.string(),
  start_date_local: z.string(),
  name: z.string(),
  type: z.string(),
  distance: z.number().nullable(),
  moving_time: z.number().nullable(),
  icu_average_hr: z.number().nullable(),
  icu_pace: z.number().nullable(),
  icu_training_load: z.number().nullable(),
});
export type ActivityApiResponse = z.infer<typeof activitySchema>;

export const activitiesResponseSchema = z.array(activitySchema);

export const activityIntervalSchema = z.object({
  label: z.string(),
  duration: z.number(),
  distance: z.number().nullable(),
  average_heartrate: z.number().nullable(),
  average_watts: z.number().nullable(),
});

export const hrZoneDistributionSchema = z.object({
  z1_secs: z.number(),
  z2_secs: z.number(),
  z3_secs: z.number(),
  z4_secs: z.number(),
  z5_secs: z.number(),
});

export const activityDetailSchema = activitySchema.extend({
  intervals: z.array(activityIntervalSchema).default([]),
  hr_zone_distribution: hrZoneDistributionSchema,
});
export type ActivityDetailApiResponse = z.infer<typeof activityDetailSchema>;
```

- [ ] **Step 5: Implement mappers**

```ts
// src/infrastructure/intervals/mappers.ts
import { Activity, ActivityDetail } from '../../domain/activity';
import { ActivityApiResponse, ActivityDetailApiResponse } from './schemas';

export function toActivity(api: ActivityApiResponse): Activity {
  return {
    id: api.id,
    date: api.start_date_local,
    name: api.name,
    sport: api.type,
    distanceMeters: api.distance ?? 0,
    durationSeconds: api.moving_time ?? 0,
    avgHeartRate: api.icu_average_hr,
    avgPace: api.icu_pace,
    trainingLoad: api.icu_training_load,
  };
}

export function toActivityDetail(api: ActivityDetailApiResponse): ActivityDetail {
  return {
    ...toActivity(api),
    intervals: api.intervals.map((i) => ({
      label: i.label,
      durationSeconds: i.duration,
      distanceMeters: i.distance,
      avgHeartRate: i.average_heartrate,
      avgPower: i.average_watts,
    })),
    hrZoneDistribution: {
      zone1Seconds: api.hr_zone_distribution.z1_secs,
      zone2Seconds: api.hr_zone_distribution.z2_secs,
      zone3Seconds: api.hr_zone_distribution.z3_secs,
      zone4Seconds: api.hr_zone_distribution.z4_secs,
      zone5Seconds: api.hr_zone_distribution.z5_secs,
    },
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test activities.contract`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/intervals/schemas.ts src/infrastructure/intervals/mappers.ts fixtures/activities.json fixtures/activity-detail.json test/intervals/activities.contract.spec.ts
git commit -m "Add activities/activity-detail schemas, mappers, fixtures, contract tests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 7: Wellness schemas, mappers, fixtures, contract tests

**Files:**
- Modify: `src/infrastructure/intervals/schemas.ts` (append)
- Modify: `src/infrastructure/intervals/mappers.ts` (append)
- Create: `fixtures/wellness.json`
- Create: `test/intervals/wellness.contract.spec.ts`

**Interfaces:**
- Consumes: `Wellness` from Task 2.
- Produces: `wellnessSchema`, `wellnessResponseSchema`, `toWellness(api): Wellness` — reused by `IntervalsHttpAdapter` in Task 9.

- [ ] **Step 1: Write the failing contract test**

```ts
// test/intervals/wellness.contract.spec.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { wellnessResponseSchema } from '../../src/infrastructure/intervals/schemas';
import { toWellness } from '../../src/infrastructure/intervals/mappers';

describe('intervals.icu wellness contract', () => {
  it('parses and maps the wellness fixture', () => {
    const raw = JSON.parse(readFileSync(join(__dirname, '../../fixtures/wellness.json'), 'utf-8'));
    const parsed = wellnessResponseSchema.parse(raw);
    const days = parsed.map(toWellness);
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ date: '2026-09-01', hrv: 62 });
    expect(days[1].sleepHours).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test wellness.contract`
Expected: FAIL — fixture and schema/mapper additions don't exist yet

- [ ] **Step 3: Add fixture**

```json
// fixtures/wellness.json
[
  {
    "id": "2026-09-01",
    "hrv": 62,
    "restingHR": 48,
    "sleepSecs": 27000,
    "weight": 71.2,
    "fatigue": 2
  },
  {
    "id": "2026-09-02",
    "hrv": 58,
    "restingHR": 50,
    "sleepSecs": null,
    "weight": null,
    "fatigue": 3
  }
]
```

- [ ] **Step 4: Append schema**

```ts
// append to src/infrastructure/intervals/schemas.ts
export const wellnessSchema = z.object({
  id: z.string(),
  hrv: z.number().nullable(),
  restingHR: z.number().nullable(),
  sleepSecs: z.number().nullable(),
  weight: z.number().nullable(),
  fatigue: z.number().nullable(),
});
export type WellnessApiResponse = z.infer<typeof wellnessSchema>;

export const wellnessResponseSchema = z.array(wellnessSchema);
```

- [ ] **Step 5: Append mapper**

```ts
// append to src/infrastructure/intervals/mappers.ts
import { Wellness } from '../../domain/wellness';
import { WellnessApiResponse } from './schemas';

export function toWellness(api: WellnessApiResponse): Wellness {
  return {
    date: api.id,
    hrv: api.hrv,
    restingHeartRate: api.restingHR,
    sleepHours: api.sleepSecs !== null ? api.sleepSecs / 3600 : null,
    weightKg: api.weight,
    fatigue: api.fatigue,
  };
}
```

(Add the `Wellness`/`WellnessApiResponse` imports to the existing import statements at the top of `mappers.ts` rather than duplicating import lines.)

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test wellness.contract`
Expected: PASS

- [ ] **Step 7: Run full suite to check nothing broke**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/infrastructure/intervals/schemas.ts src/infrastructure/intervals/mappers.ts fixtures/wellness.json test/intervals/wellness.contract.spec.ts
git commit -m "Add wellness schema, mapper, fixture, contract test

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 8: Planned workouts schemas, mappers, fixtures, contract tests

**Files:**
- Modify: `src/infrastructure/intervals/schemas.ts` (append)
- Modify: `src/infrastructure/intervals/mappers.ts` (append)
- Create: `fixtures/planned-workouts.json`
- Create: `test/intervals/planned-workouts.contract.spec.ts`

**Interfaces:**
- Consumes: `PlannedWorkout` from Task 2.
- Produces: `plannedWorkoutSchema`, `plannedWorkoutsResponseSchema`, `toPlannedWorkout(api): PlannedWorkout` — reused by `IntervalsHttpAdapter` in Task 9.

- [ ] **Step 1: Write the failing contract test**

```ts
// test/intervals/planned-workouts.contract.spec.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { plannedWorkoutsResponseSchema } from '../../src/infrastructure/intervals/schemas';
import { toPlannedWorkout } from '../../src/infrastructure/intervals/mappers';

describe('intervals.icu planned workouts contract', () => {
  it('parses and maps the planned workouts fixture', () => {
    const raw = JSON.parse(
      readFileSync(join(__dirname, '../../fixtures/planned-workouts.json'), 'utf-8'),
    );
    const parsed = plannedWorkoutsResponseSchema.parse(raw);
    const workouts = parsed.map(toPlannedWorkout);
    expect(workouts).toHaveLength(1);
    expect(workouts[0]).toMatchObject({ id: 'e987', sport: 'Run', name: 'Tempo run' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test planned-workouts.contract`
Expected: FAIL — fixture and schema/mapper additions don't exist yet

- [ ] **Step 3: Add fixture**

```json
// fixtures/planned-workouts.json
[
  {
    "id": "e987",
    "start_date_local": "2026-09-08T06:00:00",
    "name": "Tempo run",
    "type": "Run",
    "description": "20min warmup, 30min @ threshold, 10min cooldown",
    "moving_time": 3600,
    "distance": 9000
  }
]
```

- [ ] **Step 4: Append schema**

```ts
// append to src/infrastructure/intervals/schemas.ts
export const plannedWorkoutSchema = z.object({
  id: z.string(),
  start_date_local: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  moving_time: z.number().nullable(),
  distance: z.number().nullable(),
});
export type PlannedWorkoutApiResponse = z.infer<typeof plannedWorkoutSchema>;

export const plannedWorkoutsResponseSchema = z.array(plannedWorkoutSchema);
```

- [ ] **Step 5: Append mapper**

```ts
// append to src/infrastructure/intervals/mappers.ts
import { PlannedWorkout } from '../../domain/planned-workout';
import { PlannedWorkoutApiResponse } from './schemas';

export function toPlannedWorkout(api: PlannedWorkoutApiResponse): PlannedWorkout {
  return {
    id: api.id,
    date: api.start_date_local,
    name: api.name,
    sport: api.type,
    description: api.description,
    plannedDurationSeconds: api.moving_time,
    plannedDistanceMeters: api.distance,
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test planned-workouts.contract`
Expected: PASS

- [ ] **Step 7: Run full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/infrastructure/intervals/schemas.ts src/infrastructure/intervals/mappers.ts fixtures/planned-workouts.json test/intervals/planned-workouts.contract.spec.ts
git commit -m "Add planned workouts schema, mapper, fixture, contract test

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 9: IntervalsHttpAdapter and InfrastructureModule

**Files:**
- Create: `src/infrastructure/intervals/intervals-http.adapter.ts`
- Create: `src/infrastructure/intervals/intervals-http.adapter.spec.ts`
- Create: `src/infrastructure/infrastructure.module.ts`

**Interfaces:**
- Consumes: `IntervalsPort`, `ClockPort` (Task 3), `ApiKeyCredentialProvider` (Task 5), schemas/mappers (Tasks 6–8), `DateRange` (Task 2).
- Produces: `IntervalsHttpAdapter` (`@Injectable()`, `implements IntervalsPort`), `InfrastructureModule` (imports `ConfigModule`, `HttpModule`; binds `IntervalsPort` → `IntervalsHttpAdapter`, `ClockPort` → `SystemClockAdapter`; exports both tokens). Consumed by `ApplicationModule`'s use-cases (via `AppModule` wiring in Task 18) and by `record-fixtures.ts` conceptually (Task 10 does not import Nest, it calls the API directly).

- [ ] **Step 1: Write the failing tests**

```ts
// src/infrastructure/intervals/intervals-http.adapter.spec.ts
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { IntervalsHttpAdapter } from './intervals-http.adapter';
import { ApiKeyCredentialProvider } from '../auth/api-key.credential-provider';
import { DateRange } from '../../domain/date-range';

function axiosResponse<T>(data: T): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config: {} as never };
}

describe('IntervalsHttpAdapter', () => {
  const credentials = {
    getApiKey: () => 'secret123',
    getAthleteId: () => '0',
  } as unknown as ApiKeyCredentialProvider;

  it('fetches and maps activities within a date range', async () => {
    const get = jest.fn().mockReturnValue(
      of(
        axiosResponse([
          {
            id: 'i12345',
            start_date_local: '2026-09-01T07:15:00',
            name: 'Morning Ride',
            type: 'Ride',
            distance: 42000,
            moving_time: 5400,
            icu_average_hr: 142,
            icu_pace: 128.5,
            icu_training_load: 65,
          },
        ]),
      ),
    );
    const http = { get } as unknown as HttpService;
    const adapter = new IntervalsHttpAdapter(http, credentials);

    const range = DateRange.of(new Date('2026-09-01'), new Date('2026-09-07'));
    const activities = await adapter.getActivities(range);

    expect(activities).toHaveLength(1);
    expect(activities[0].id).toBe('i12345');
    expect(get).toHaveBeenCalledWith(
      'https://intervals.icu/api/v1/athlete/0/activities',
      expect.objectContaining({
        auth: { username: 'API_KEY', password: 'secret123' },
        params: expect.objectContaining({ oldest: '2026-09-01', newest: '2026-09-07' }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test intervals-http.adapter`
Expected: FAIL — `Cannot find module './intervals-http.adapter'`

- [ ] **Step 3: Implement the adapter**

```ts
// src/infrastructure/intervals/intervals-http.adapter.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IntervalsPort } from '../../application/ports/intervals.port';
import { DateRange } from '../../domain/date-range';
import { Activity, ActivityDetail, TrainingLoad } from '../../domain/activity';
import { Wellness } from '../../domain/wellness';
import { PlannedWorkout } from '../../domain/planned-workout';
import { ApiKeyCredentialProvider } from '../auth/api-key.credential-provider';
import {
  activitiesResponseSchema,
  activityDetailSchema,
  wellnessResponseSchema,
  plannedWorkoutsResponseSchema,
} from './schemas';
import { toActivity, toActivityDetail, toWellness, toPlannedWorkout } from './mappers';

const BASE_URL = 'https://intervals.icu/api/v1';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class IntervalsHttpAdapter implements IntervalsPort {
  constructor(
    private readonly http: HttpService,
    private readonly credentials: ApiKeyCredentialProvider,
  ) {}

  private auth() {
    return { username: 'API_KEY', password: this.credentials.getApiKey() };
  }

  private athletePath(): string {
    return `${BASE_URL}/athlete/${this.credentials.getAthleteId()}`;
  }

  async getActivities(range: DateRange, sport?: string): Promise<Activity[]> {
    const response = await firstValueFrom(
      this.http.get(`${this.athletePath()}/activities`, {
        auth: this.auth(),
        params: {
          oldest: isoDate(range.from),
          newest: isoDate(range.to),
          ...(sport ? { type: sport } : {}),
        },
      }),
    );
    return activitiesResponseSchema.parse(response.data).map(toActivity);
  }

  async getActivityDetail(activityId: string): Promise<ActivityDetail> {
    const response = await firstValueFrom(
      this.http.get(`${BASE_URL}/activity/${activityId}`, { auth: this.auth() }),
    );
    return toActivityDetail(activityDetailSchema.parse(response.data));
  }

  async getWellness(range: DateRange): Promise<Wellness[]> {
    const response = await firstValueFrom(
      this.http.get(`${this.athletePath()}/wellness`, {
        auth: this.auth(),
        params: { oldest: isoDate(range.from), newest: isoDate(range.to) },
      }),
    );
    return wellnessResponseSchema.parse(response.data).map(toWellness);
  }

  async getPlannedWorkouts(range: DateRange): Promise<PlannedWorkout[]> {
    const response = await firstValueFrom(
      this.http.get(`${this.athletePath()}/events`, {
        auth: this.auth(),
        params: { oldest: isoDate(range.from), newest: isoDate(range.to) },
      }),
    );
    return plannedWorkoutsResponseSchema.parse(response.data).map(toPlannedWorkout);
  }

  async getTrainingLoad(range: DateRange): Promise<TrainingLoad[]> {
    const activities = await this.getActivities(range);
    return activities
      .filter((a) => a.trainingLoad !== null)
      .map((a) => ({ date: a.date, ctl: 0, atl: 0, tsb: 0 }));
  }
}
```

Note on `getTrainingLoad`: intervals.icu exposes a wellness-embedded CTL/ATL/TSB series in practice, but the exact response shape needs confirming against a real fixture. For Phase 1, `GetTrainingLoadSummaryUseCase` (Task 16) computes CTL/ATL/TSB itself from activity training-load values rather than trusting an upstream rollup, so this method's zeroed placeholders for `ctl`/`atl`/`tsb` are never read by that use-case — it calls `getActivities` directly. Leave a comment in the code saying so.

Add the comment directly above `getTrainingLoad`:
```ts
  // NOTE: GetTrainingLoadSummaryUseCase computes CTL/ATL/TSB itself from
  // getActivities() and does not call this method. This method exists to
  // satisfy IntervalsPort's shape; revisit if a future use-case needs
  // upstream-computed load directly.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test intervals-http.adapter`
Expected: PASS

- [ ] **Step 5: Create InfrastructureModule**

```ts
// src/infrastructure/infrastructure.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { IntervalsPort } from '../application/ports/intervals.port';
import { ClockPort } from '../application/ports/clock.port';
import { IntervalsHttpAdapter } from './intervals/intervals-http.adapter';
import { SystemClockAdapter } from './clock/system-clock.adapter';
import { ApiKeyCredentialProvider } from './auth/api-key.credential-provider';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  providers: [
    ApiKeyCredentialProvider,
    { provide: IntervalsPort, useClass: IntervalsHttpAdapter },
    { provide: ClockPort, useClass: SystemClockAdapter },
  ],
  exports: [IntervalsPort, ClockPort],
})
export class InfrastructureModule {}
```

- [ ] **Step 6: Run full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/intervals/intervals-http.adapter.ts src/infrastructure/intervals/intervals-http.adapter.spec.ts src/infrastructure/infrastructure.module.ts
git commit -m "Add IntervalsHttpAdapter and InfrastructureModule

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 10: Fixture-recording script

**Files:**
- Create: `scripts/record-fixtures.ts`
- Modify: `package.json` (add `fixtures:record` script)

**Interfaces:**
- Produces: a standalone script (no Nest, no test) you run manually once `.env` has a real `INTERVALS_API_KEY`, to refresh `fixtures/*.json` with live data. Not executed by CI or by this plan's automated steps — requires a real account.

- [ ] **Step 1: Write the script**

```ts
// scripts/record-fixtures.ts
import { config } from 'dotenv';
import axios from 'axios';
import { writeFileSync } from 'fs';
import { join } from 'path';

config();

const apiKey = process.env.INTERVALS_API_KEY;
const athleteId = process.env.INTERVALS_ATHLETE_ID ?? '0';

if (!apiKey) {
  console.error('INTERVALS_API_KEY is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const auth = { username: 'API_KEY', password: apiKey };
const base = 'https://intervals.icu/api/v1';
const oldest = '2026-08-01';
const newest = '2026-09-13';

async function record(name: string, url: string, params: Record<string, string>) {
  const response = await axios.get(url, { auth, params });
  writeFileSync(join(__dirname, '../fixtures', name), JSON.stringify(response.data, null, 2));
  console.log(`Wrote fixtures/${name}`);
}

async function main() {
  await record('activities.json', `${base}/athlete/${athleteId}/activities`, { oldest, newest });
  await record('wellness.json', `${base}/athlete/${athleteId}/wellness`, { oldest, newest });
  await record('planned-workouts.json', `${base}/athlete/${athleteId}/events`, { oldest, newest });

  const activities = JSON.parse(
    require('fs').readFileSync(join(__dirname, '../fixtures/activities.json'), 'utf-8'),
  );
  if (activities.length > 0) {
    await record(`activity-detail.json`, `${base}/activity/${activities[0].id}`, {});
  } else {
    console.warn('No activities in range; activity-detail.json was not refreshed.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Install dotenv and add the script command**

Run: `pnpm add -D dotenv`

Edit `package.json` `"scripts"` to add:
```json
"fixtures:record": "ts-node scripts/record-fixtures.ts"
```

- [ ] **Step 3: Verify it compiles (do not run against the real API here)**

Run: `pnpm exec tsc --noEmit scripts/record-fixtures.ts`
Expected: no type errors. Do not run `pnpm fixtures:record` as part of this task — it requires a real `.env` with a live key, which the user adds after this plan finishes (see spec's "API key" decision).

- [ ] **Step 4: Commit**

```bash
git add scripts/record-fixtures.ts package.json pnpm-lock.yaml
git commit -m "Add manual fixture-recording script for live intervals.icu data

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 11: MCP tool contract, span wrapper, error mapping

**Files:**
- Create: `src/mcp/tool.ts`
- Create: `src/mcp/with-tool-span.ts`
- Create: `src/mcp/errors.ts`
- Create: `src/mcp/errors.spec.ts`
- Create: `src/mcp/mcp.module.ts` (empty shell, filled in Tasks 12–17)

**Interfaces:**
- Produces: `McpTool<I, O>` interface (`name: string`, `description: string`, `inputSchema: ZodType<I>`, `execute(input: I): Promise<O>`), `withToolSpan<I, O>(toolName: string, handler: (input: I) => Promise<O>): (input: I) => Promise<O>` (Phase 1: passthrough), `toMcpError(err: unknown): { code: string; message: string }`. Every tool in Tasks 12–17 implements `McpTool` and wraps its `execute` with `withToolSpan`.

- [ ] **Step 1: Define the tool contract**

```ts
// src/mcp/tool.ts
import { ZodType } from 'zod';

export interface McpTool<I, O> {
  name: string;
  description: string;
  inputSchema: ZodType<I>;
  execute(input: I): Promise<O>;
}
```

- [ ] **Step 2: Implement the span wrapper (Phase 1: passthrough)**

```ts
// src/mcp/with-tool-span.ts
// Phase 2 replaces this body with an OTel span per the blueprint's
// `mcp.tool/<name>` wrapper pattern. Tool code calling withToolSpan
// does not change when that lands.
export function withToolSpan<I, O>(
  toolName: string,
  handler: (input: I) => Promise<O>,
): (input: I) => Promise<O> {
  return async (input: I): Promise<O> => handler(input);
}
```

- [ ] **Step 3: Write the failing test for error mapping**

```ts
// src/mcp/errors.spec.ts
import { toMcpError } from './errors';

describe('toMcpError', () => {
  it('maps an Error to a generic error code with its message', () => {
    const result = toMcpError(new Error('upstream timed out'));
    expect(result).toEqual({ code: 'INTERNAL_ERROR', message: 'upstream timed out' });
  });

  it('maps a non-Error thrown value to a generic message', () => {
    const result = toMcpError('boom');
    expect(result).toEqual({ code: 'INTERNAL_ERROR', message: 'boom' });
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test errors.spec`
Expected: FAIL — `Cannot find module './errors'`

- [ ] **Step 5: Implement error mapping**

```ts
// src/mcp/errors.ts
export function toMcpError(err: unknown): { code: string; message: string } {
  if (err instanceof Error) {
    return { code: 'INTERNAL_ERROR', message: err.message };
  }
  return { code: 'INTERNAL_ERROR', message: String(err) };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test errors.spec`
Expected: PASS (2 tests)

- [ ] **Step 7: Create the McpModule shell**

```ts
// src/mcp/mcp.module.ts
import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';

@Module({
  imports: [ApplicationModule],
  providers: [],
  exports: [],
})
export class McpModule {}
```

- [ ] **Step 8: Commit**

```bash
git add src/mcp
git commit -m "Add McpTool contract, tool-span wrapper seam, error mapping

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 12: get_recent_activities (use-case + tool)

**Files:**
- Create: `src/application/use-cases/get-recent-activities.use-case.ts`
- Create: `src/application/use-cases/get-recent-activities.use-case.spec.ts`
- Create: `src/mcp/tools/recent-activities.tool.ts`
- Modify: `src/application/application.module.ts` (register provider, export)
- Modify: `src/mcp/mcp.module.ts` (register provider)

**Interfaces:**
- Consumes: `IntervalsPort` (Task 3), `DateRange`, `Activity` (Task 2), `McpTool`, `withToolSpan` (Task 11).
- Produces: `GetRecentActivitiesUseCase` (`execute(input: { from: string; to: string; sport?: string; limit?: number }): Promise<{ activities: Activity[]; truncated: boolean; shown: number; total: number }>`), `RecentActivitiesTool` implementing `McpTool`.

- [ ] **Step 1: Write the failing use-case tests**

```ts
// src/application/use-cases/get-recent-activities.use-case.spec.ts
import { GetRecentActivitiesUseCase } from './get-recent-activities.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { Activity } from '../../domain/activity';

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'i1',
    date: '2026-09-01',
    name: 'Ride',
    sport: 'Ride',
    distanceMeters: 10000,
    durationSeconds: 1800,
    avgHeartRate: 140,
    avgPace: 100,
    trainingLoad: 40,
    ...overrides,
  };
}

describe('GetRecentActivitiesUseCase', () => {
  it('returns activities within the range, capped at the default limit', async () => {
    const activities = Array.from({ length: 5 }, (_, i) => makeActivity({ id: `i${i}` }));
    const port = { getActivities: jest.fn().mockResolvedValue(activities) } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port);

    const result = await useCase.execute({ from: '2026-09-01', to: '2026-09-07' });

    expect(result.total).toBe(5);
    expect(result.shown).toBe(5);
    expect(result.truncated).toBe(false);
    expect(port.getActivities).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('truncates and reports truncation when limit is smaller than total', async () => {
    const activities = Array.from({ length: 5 }, (_, i) => makeActivity({ id: `i${i}` }));
    const port = { getActivities: jest.fn().mockResolvedValue(activities) } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port);

    const result = await useCase.execute({ from: '2026-09-01', to: '2026-09-07', limit: 2 });

    expect(result.shown).toBe(2);
    expect(result.total).toBe(5);
    expect(result.truncated).toBe(true);
    expect(result.activities).toHaveLength(2);
  });

  it('passes the sport filter through to the port', async () => {
    const port = { getActivities: jest.fn().mockResolvedValue([]) } as unknown as IntervalsPort;
    const useCase = new GetRecentActivitiesUseCase(port);

    await useCase.execute({ from: '2026-09-01', to: '2026-09-07', sport: 'Run' });

    expect(port.getActivities).toHaveBeenCalledWith(expect.anything(), 'Run');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test get-recent-activities.use-case`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement the use-case**

```ts
// src/application/use-cases/get-recent-activities.use-case.ts
import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { DateRange } from '../../domain/date-range';
import { Activity } from '../../domain/activity';

export interface GetRecentActivitiesInput {
  from: string;
  to: string;
  sport?: string;
  limit?: number;
}

export interface GetRecentActivitiesOutput {
  activities: Activity[];
  truncated: boolean;
  shown: number;
  total: number;
}

const DEFAULT_LIMIT = 20;

@Injectable()
export class GetRecentActivitiesUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  async execute(input: GetRecentActivitiesInput): Promise<GetRecentActivitiesOutput> {
    const range = DateRange.of(new Date(input.from), new Date(input.to));
    const all = await this.intervals.getActivities(range, input.sport);
    const limit = input.limit ?? DEFAULT_LIMIT;
    const activities = all.slice(0, limit);
    return {
      activities,
      truncated: all.length > activities.length,
      shown: activities.length,
      total: all.length,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test get-recent-activities.use-case`
Expected: PASS (3 tests)

- [ ] **Step 5: Implement the tool**

```ts
// src/mcp/tools/recent-activities.tool.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetRecentActivitiesUseCase,
  GetRecentActivitiesInput,
  GetRecentActivitiesOutput,
} from '../../application/use-cases/get-recent-activities.use-case';

const inputSchema = z.object({
  from: z.string().describe('ISO date, inclusive'),
  to: z.string().describe('ISO date, inclusive'),
  sport: z.string().optional().describe('Filter by sport, e.g. "Ride" or "Run"'),
  limit: z.number().int().positive().max(50).optional(),
});

@Injectable()
export class RecentActivitiesTool implements McpTool<GetRecentActivitiesInput, GetRecentActivitiesOutput> {
  name = 'get_recent_activities';
  description =
    'List recent activities in a date range with compact summaries (date, name, distance, duration, avg HR, pace, load). ' +
    'Use for browsing sessions over days/weeks. For full detail on one session (intervals, HR zones), use get_activity_detail.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetRecentActivitiesUseCase) {}

  execute = withToolSpan(this.name, (input: GetRecentActivitiesInput) => this.useCase.execute(input));
}
```

- [ ] **Step 6: Register in ApplicationModule**

```ts
// src/application/application.module.ts
import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';

@Module({
  providers: [GetRecentActivitiesUseCase],
  exports: [GetRecentActivitiesUseCase],
})
export class ApplicationModule {}
```

- [ ] **Step 7: Register in McpModule**

```ts
// src/mcp/mcp.module.ts
import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';

@Module({
  imports: [ApplicationModule],
  providers: [RecentActivitiesTool],
  exports: [RecentActivitiesTool],
})
export class McpModule {}
```

- [ ] **Step 8: Run full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/application/use-cases/get-recent-activities.use-case.ts src/application/use-cases/get-recent-activities.use-case.spec.ts src/mcp/tools/recent-activities.tool.ts src/application/application.module.ts src/mcp/mcp.module.ts
git commit -m "Add get_recent_activities use-case and MCP tool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 13: get_activity_detail (use-case + tool)

**Files:**
- Create: `src/application/use-cases/get-activity-detail.use-case.ts`
- Create: `src/application/use-cases/get-activity-detail.use-case.spec.ts`
- Create: `src/mcp/tools/activity-detail.tool.ts`
- Modify: `src/application/application.module.ts` (add provider/export)
- Modify: `src/mcp/mcp.module.ts` (add provider/export)

**Interfaces:**
- Consumes: `IntervalsPort`, `ActivityDetail`, `McpTool`, `withToolSpan`.
- Produces: `GetActivityDetailUseCase` (`execute(input: { activityId: string }): Promise<ActivityDetail>`), `ActivityDetailTool`.

- [ ] **Step 1: Write the failing test**

```ts
// src/application/use-cases/get-activity-detail.use-case.spec.ts
import { GetActivityDetailUseCase } from './get-activity-detail.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { ActivityDetail } from '../../domain/activity';

describe('GetActivityDetailUseCase', () => {
  it('delegates to the port and returns the detail', async () => {
    const detail: ActivityDetail = {
      id: 'i1',
      date: '2026-09-01',
      name: 'Ride',
      sport: 'Ride',
      distanceMeters: 10000,
      durationSeconds: 1800,
      avgHeartRate: 140,
      avgPace: 100,
      trainingLoad: 40,
      intervals: [],
      hrZoneDistribution: {
        zone1Seconds: 0,
        zone2Seconds: 0,
        zone3Seconds: 0,
        zone4Seconds: 0,
        zone5Seconds: 0,
      },
    };
    const port = { getActivityDetail: jest.fn().mockResolvedValue(detail) } as unknown as IntervalsPort;
    const useCase = new GetActivityDetailUseCase(port);

    const result = await useCase.execute({ activityId: 'i1' });

    expect(result).toEqual(detail);
    expect(port.getActivityDetail).toHaveBeenCalledWith('i1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test get-activity-detail.use-case`
Expected: FAIL — module doesn't exist

- [ ] **Step 3: Implement the use-case**

```ts
// src/application/use-cases/get-activity-detail.use-case.ts
import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { ActivityDetail } from '../../domain/activity';

export interface GetActivityDetailInput {
  activityId: string;
}

@Injectable()
export class GetActivityDetailUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  execute(input: GetActivityDetailInput): Promise<ActivityDetail> {
    return this.intervals.getActivityDetail(input.activityId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test get-activity-detail.use-case`
Expected: PASS

- [ ] **Step 5: Implement the tool**

```ts
// src/mcp/tools/activity-detail.tool.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import { GetActivityDetailUseCase, GetActivityDetailInput } from '../../application/use-cases/get-activity-detail.use-case';
import { ActivityDetail } from '../../domain/activity';

const inputSchema = z.object({
  activityId: z.string(),
});

@Injectable()
export class ActivityDetailTool implements McpTool<GetActivityDetailInput, ActivityDetail> {
  name = 'get_activity_detail';
  description =
    'Full detail for one activity: intervals/laps and HR zone distribution. ' +
    'Use after get_recent_activities has identified the activityId. Not for browsing multiple sessions.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetActivityDetailUseCase) {}

  execute = withToolSpan(this.name, (input: GetActivityDetailInput) => this.useCase.execute(input));
}
```

- [ ] **Step 6: Register in ApplicationModule and McpModule**

```ts
// src/application/application.module.ts
import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';
import { GetActivityDetailUseCase } from './use-cases/get-activity-detail.use-case';

@Module({
  providers: [GetRecentActivitiesUseCase, GetActivityDetailUseCase],
  exports: [GetRecentActivitiesUseCase, GetActivityDetailUseCase],
})
export class ApplicationModule {}
```

```ts
// src/mcp/mcp.module.ts
import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';

@Module({
  imports: [ApplicationModule],
  providers: [RecentActivitiesTool, ActivityDetailTool],
  exports: [RecentActivitiesTool, ActivityDetailTool],
})
export class McpModule {}
```

- [ ] **Step 7: Run full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/application/use-cases/get-activity-detail.use-case.ts src/application/use-cases/get-activity-detail.use-case.spec.ts src/mcp/tools/activity-detail.tool.ts src/application/application.module.ts src/mcp/mcp.module.ts
git commit -m "Add get_activity_detail use-case and MCP tool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 14: get_wellness_trend (use-case + tool)

**Files:**
- Create: `src/application/use-cases/get-wellness-trend.use-case.ts`
- Create: `src/application/use-cases/get-wellness-trend.use-case.spec.ts`
- Create: `src/mcp/tools/wellness-trend.tool.ts`
- Modify: `src/application/application.module.ts`, `src/mcp/mcp.module.ts`

**Interfaces:**
- Consumes: `IntervalsPort`, `Wellness`, `DateRange`, `McpTool`, `withToolSpan`.
- Produces: `GetWellnessTrendUseCase` (`execute(input: { from: string; to: string }): Promise<{ days: Wellness[] }>`), `WellnessTrendTool`.

- [ ] **Step 1: Write the failing test**

```ts
// src/application/use-cases/get-wellness-trend.use-case.spec.ts
import { GetWellnessTrendUseCase } from './get-wellness-trend.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { Wellness } from '../../domain/wellness';

describe('GetWellnessTrendUseCase', () => {
  it('returns the wellness days for the range', async () => {
    const days: Wellness[] = [
      { date: '2026-09-01', hrv: 60, restingHeartRate: 48, sleepHours: 7.5, weightKg: 70, fatigue: 2 },
    ];
    const port = { getWellness: jest.fn().mockResolvedValue(days) } as unknown as IntervalsPort;
    const useCase = new GetWellnessTrendUseCase(port);

    const result = await useCase.execute({ from: '2026-09-01', to: '2026-09-07' });

    expect(result.days).toEqual(days);
    expect(port.getWellness).toHaveBeenCalledWith(expect.anything());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test get-wellness-trend.use-case`
Expected: FAIL

- [ ] **Step 3: Implement the use-case**

```ts
// src/application/use-cases/get-wellness-trend.use-case.ts
import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { DateRange } from '../../domain/date-range';
import { Wellness } from '../../domain/wellness';

export interface GetWellnessTrendInput {
  from: string;
  to: string;
}

export interface GetWellnessTrendOutput {
  days: Wellness[];
}

@Injectable()
export class GetWellnessTrendUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  async execute(input: GetWellnessTrendInput): Promise<GetWellnessTrendOutput> {
    const range = DateRange.of(new Date(input.from), new Date(input.to));
    const days = await this.intervals.getWellness(range);
    return { days };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test get-wellness-trend.use-case`
Expected: PASS

- [ ] **Step 5: Implement the tool**

```ts
// src/mcp/tools/wellness-trend.tool.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetWellnessTrendUseCase,
  GetWellnessTrendInput,
  GetWellnessTrendOutput,
} from '../../application/use-cases/get-wellness-trend.use-case';

const inputSchema = z.object({
  from: z.string().describe('ISO date, inclusive'),
  to: z.string().describe('ISO date, inclusive'),
});

@Injectable()
export class WellnessTrendTool implements McpTool<GetWellnessTrendInput, GetWellnessTrendOutput> {
  name = 'get_wellness_trend';
  description =
    'Daily wellness series (HRV, resting HR, sleep, weight, fatigue) for a date range. ' +
    'Use for trends over days/weeks, not for training load (use get_training_load_summary for that).';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetWellnessTrendUseCase) {}

  execute = withToolSpan(this.name, (input: GetWellnessTrendInput) => this.useCase.execute(input));
}
```

- [ ] **Step 6: Register in ApplicationModule and McpModule**

```ts
// src/application/application.module.ts
import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';
import { GetActivityDetailUseCase } from './use-cases/get-activity-detail.use-case';
import { GetWellnessTrendUseCase } from './use-cases/get-wellness-trend.use-case';

@Module({
  providers: [GetRecentActivitiesUseCase, GetActivityDetailUseCase, GetWellnessTrendUseCase],
  exports: [GetRecentActivitiesUseCase, GetActivityDetailUseCase, GetWellnessTrendUseCase],
})
export class ApplicationModule {}
```

```ts
// src/mcp/mcp.module.ts
import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';

@Module({
  imports: [ApplicationModule],
  providers: [RecentActivitiesTool, ActivityDetailTool, WellnessTrendTool],
  exports: [RecentActivitiesTool, ActivityDetailTool, WellnessTrendTool],
})
export class McpModule {}
```

- [ ] **Step 7: Run full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/application/use-cases/get-wellness-trend.use-case.ts src/application/use-cases/get-wellness-trend.use-case.spec.ts src/mcp/tools/wellness-trend.tool.ts src/application/application.module.ts src/mcp/mcp.module.ts
git commit -m "Add get_wellness_trend use-case and MCP tool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 15: get_planned_week (use-case + tool)

**Files:**
- Create: `src/application/use-cases/get-planned-week.use-case.ts`
- Create: `src/application/use-cases/get-planned-week.use-case.spec.ts`
- Create: `src/mcp/tools/planned-week.tool.ts`
- Modify: `src/application/application.module.ts`, `src/mcp/mcp.module.ts`

**Interfaces:**
- Consumes: `IntervalsPort`, `ClockPort`, `PlannedWorkout`, `DateRange`, `McpTool`, `withToolSpan`.
- Produces: `GetPlannedWeekUseCase` (`execute(input: { weekStart?: string }): Promise<{ workouts: PlannedWorkout[] }>` — defaults to the current week via `ClockPort` when `weekStart` is omitted), `PlannedWeekTool`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/application/use-cases/get-planned-week.use-case.spec.ts
import { GetPlannedWeekUseCase } from './get-planned-week.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { ClockPort } from '../ports/clock.port';
import { PlannedWorkout } from '../../domain/planned-workout';

describe('GetPlannedWeekUseCase', () => {
  const workout: PlannedWorkout = {
    id: 'e1',
    date: '2026-09-08',
    name: 'Tempo run',
    sport: 'Run',
    description: null,
    plannedDurationSeconds: 3600,
    plannedDistanceMeters: 9000,
  };

  it('uses the given weekStart when provided', async () => {
    const port = { getPlannedWorkouts: jest.fn().mockResolvedValue([workout]) } as unknown as IntervalsPort;
    const clock = { now: jest.fn() } as unknown as ClockPort;
    const useCase = new GetPlannedWeekUseCase(port, clock);

    const result = await useCase.execute({ weekStart: '2026-09-08' });

    expect(result.workouts).toEqual([workout]);
    expect(clock.now).not.toHaveBeenCalled();
  });

  it('defaults to the current week when weekStart is omitted', async () => {
    const port = { getPlannedWorkouts: jest.fn().mockResolvedValue([workout]) } as unknown as IntervalsPort;
    const clock = { now: () => new Date('2026-09-10') } as unknown as ClockPort;
    const useCase = new GetPlannedWeekUseCase(port, clock);

    await useCase.execute({});

    expect(port.getPlannedWorkouts).toHaveBeenCalledWith(expect.anything());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test get-planned-week.use-case`
Expected: FAIL

- [ ] **Step 3: Implement the use-case**

```ts
// src/application/use-cases/get-planned-week.use-case.ts
import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { ClockPort } from '../ports/clock.port';
import { DateRange } from '../../domain/date-range';
import { PlannedWorkout } from '../../domain/planned-workout';

export interface GetPlannedWeekInput {
  weekStart?: string;
}

export interface GetPlannedWeekOutput {
  workouts: PlannedWorkout[];
}

function startOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  const diff = (day + 6) % 7; // Monday as start of week
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - diff);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

@Injectable()
export class GetPlannedWeekUseCase {
  constructor(
    private readonly intervals: IntervalsPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: GetPlannedWeekInput): Promise<GetPlannedWeekOutput> {
    const from = input.weekStart ? new Date(input.weekStart) : startOfWeek(this.clock.now());
    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 6);
    const range = DateRange.of(from, to);
    const workouts = await this.intervals.getPlannedWorkouts(range);
    return { workouts };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test get-planned-week.use-case`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement the tool**

```ts
// src/mcp/tools/planned-week.tool.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetPlannedWeekUseCase,
  GetPlannedWeekInput,
  GetPlannedWeekOutput,
} from '../../application/use-cases/get-planned-week.use-case';

const inputSchema = z.object({
  weekStart: z.string().optional().describe('ISO date for the Monday of the target week; defaults to this week'),
});

@Injectable()
export class PlannedWeekTool implements McpTool<GetPlannedWeekInput, GetPlannedWeekOutput> {
  name = 'get_planned_week';
  description =
    'Planned workouts from the calendar for one week. Defaults to the current week if weekStart is omitted. ' +
    'Use for "what should I do this week", not for past completed activities.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetPlannedWeekUseCase) {}

  execute = withToolSpan(this.name, (input: GetPlannedWeekInput) => this.useCase.execute(input));
}
```

- [ ] **Step 6: Register in ApplicationModule and McpModule**

```ts
// src/application/application.module.ts
import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';
import { GetActivityDetailUseCase } from './use-cases/get-activity-detail.use-case';
import { GetWellnessTrendUseCase } from './use-cases/get-wellness-trend.use-case';
import { GetPlannedWeekUseCase } from './use-cases/get-planned-week.use-case';

@Module({
  providers: [
    GetRecentActivitiesUseCase,
    GetActivityDetailUseCase,
    GetWellnessTrendUseCase,
    GetPlannedWeekUseCase,
  ],
  exports: [
    GetRecentActivitiesUseCase,
    GetActivityDetailUseCase,
    GetWellnessTrendUseCase,
    GetPlannedWeekUseCase,
  ],
})
export class ApplicationModule {}
```

```ts
// src/mcp/mcp.module.ts
import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';

@Module({
  imports: [ApplicationModule],
  providers: [RecentActivitiesTool, ActivityDetailTool, WellnessTrendTool, PlannedWeekTool],
  exports: [RecentActivitiesTool, ActivityDetailTool, WellnessTrendTool, PlannedWeekTool],
})
export class McpModule {}
```

- [ ] **Step 7: Run full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/application/use-cases/get-planned-week.use-case.ts src/application/use-cases/get-planned-week.use-case.spec.ts src/mcp/tools/planned-week.tool.ts src/application/application.module.ts src/mcp/mcp.module.ts
git commit -m "Add get_planned_week use-case and MCP tool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 16: get_training_load_summary (use-case + tool)

**Files:**
- Create: `src/application/use-cases/get-training-load-summary.use-case.ts`
- Create: `src/application/use-cases/get-training-load-summary.use-case.spec.ts`
- Create: `src/mcp/tools/training-load-summary.tool.ts`
- Modify: `src/application/application.module.ts`, `src/mcp/mcp.module.ts`

**Interfaces:**
- Consumes: `IntervalsPort`, `ClockPort`, `Activity`, `TrainingLoad`, `DateRange`, `McpTool`, `withToolSpan`.
- Produces: `GetTrainingLoadSummaryUseCase` (`execute(input: { weeks: number }): Promise<{ points: TrainingLoad[]; weeklyVolume: { weekStart: string; totalDurationSeconds: number; totalDistanceMeters: number }[] }>` — computes CTL/ATL/TSB from daily training-load values using standard 42-day/7-day exponentially-weighted averages), `TrainingLoadSummaryTool`.

This is the use-case with real business logic per blueprint §4 — it computes in the application layer instead of shipping raw rows to the model.

- [ ] **Step 1: Write the failing tests**

```ts
// src/application/use-cases/get-training-load-summary.use-case.spec.ts
import { GetTrainingLoadSummaryUseCase } from './get-training-load-summary.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { ClockPort } from '../ports/clock.port';
import { Activity } from '../../domain/activity';

function makeActivity(date: string, load: number): Activity {
  return {
    id: date,
    date,
    name: 'Session',
    sport: 'Ride',
    distanceMeters: 20000,
    durationSeconds: 3600,
    avgHeartRate: 140,
    avgPace: 100,
    trainingLoad: load,
  };
}

describe('GetTrainingLoadSummaryUseCase', () => {
  const clock = { now: () => new Date('2026-09-14') } as unknown as ClockPort;

  it('computes one CTL/ATL/TSB point per day with activity data, ATL rising with recent load', async () => {
    const activities = [makeActivity('2026-09-01', 50), makeActivity('2026-09-02', 80)];
    const port = { getActivities: jest.fn().mockResolvedValue(activities) } as unknown as IntervalsPort;
    const useCase = new GetTrainingLoadSummaryUseCase(port, clock);

    const result = await useCase.execute({ weeks: 2 });

    expect(result.points.length).toBeGreaterThan(0);
    const day2 = result.points.find((p) => p.date === '2026-09-02')!;
    const day1 = result.points.find((p) => p.date === '2026-09-01')!;
    expect(day2.atl).toBeGreaterThan(day1.atl);
  });

  it('aggregates weekly volume from activity distance/duration', async () => {
    const activities = [makeActivity('2026-09-01', 50), makeActivity('2026-09-02', 80)];
    const port = { getActivities: jest.fn().mockResolvedValue(activities) } as unknown as IntervalsPort;
    const useCase = new GetTrainingLoadSummaryUseCase(port, clock);

    const result = await useCase.execute({ weeks: 2 });

    const totalDistance = result.weeklyVolume.reduce((sum, w) => sum + w.totalDistanceMeters, 0);
    expect(totalDistance).toBe(40000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test get-training-load-summary.use-case`
Expected: FAIL

- [ ] **Step 3: Implement the use-case**

```ts
// src/application/use-cases/get-training-load-summary.use-case.ts
import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { ClockPort } from '../ports/clock.port';
import { DateRange } from '../../domain/date-range';
import { TrainingLoad } from '../../domain/activity';

export interface GetTrainingLoadSummaryInput {
  weeks: number;
}

export interface WeeklyVolume {
  weekStart: string;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
}

export interface GetTrainingLoadSummaryOutput {
  points: TrainingLoad[];
  weeklyVolume: WeeklyVolume[];
}

const CTL_DAYS = 42;
const ATL_DAYS = 7;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekStartOf(isoDate: string): string {
  const d = new Date(isoDate);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return isoDay(d);
}

@Injectable()
export class GetTrainingLoadSummaryUseCase {
  constructor(
    private readonly intervals: IntervalsPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: GetTrainingLoadSummaryInput): Promise<GetTrainingLoadSummaryOutput> {
    const to = this.clock.now();
    const from = new Date(to);
    from.setUTCDate(to.getUTCDate() - input.weeks * 7);
    const range = DateRange.of(from, to);

    const activities = await this.intervals.getActivities(range);

    const loadByDay = new Map<string, number>();
    for (const activity of activities) {
      const day = activity.date.slice(0, 10);
      loadByDay.set(day, (loadByDay.get(day) ?? 0) + (activity.trainingLoad ?? 0));
    }

    const days: string[] = [];
    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push(isoDay(d));
    }

    const ctlAlpha = 2 / (CTL_DAYS + 1);
    const atlAlpha = 2 / (ATL_DAYS + 1);
    let ctl = 0;
    let atl = 0;
    const points: TrainingLoad[] = days.map((day) => {
      const load = loadByDay.get(day) ?? 0;
      ctl = ctl + ctlAlpha * (load - ctl);
      atl = atl + atlAlpha * (load - atl);
      return { date: day, ctl: Math.round(ctl * 10) / 10, atl: Math.round(atl * 10) / 10, tsb: Math.round((ctl - atl) * 10) / 10 };
    });

    const volumeByWeek = new Map<string, WeeklyVolume>();
    for (const activity of activities) {
      const week = weekStartOf(activity.date.slice(0, 10));
      const existing = volumeByWeek.get(week) ?? { weekStart: week, totalDurationSeconds: 0, totalDistanceMeters: 0 };
      existing.totalDurationSeconds += activity.durationSeconds;
      existing.totalDistanceMeters += activity.distanceMeters;
      volumeByWeek.set(week, existing);
    }

    return {
      points,
      weeklyVolume: Array.from(volumeByWeek.values()).sort((a, b) => a.weekStart.localeCompare(b.weekStart)),
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test get-training-load-summary.use-case`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement the tool**

```ts
// src/mcp/tools/training-load-summary.tool.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  GetTrainingLoadSummaryUseCase,
  GetTrainingLoadSummaryInput,
  GetTrainingLoadSummaryOutput,
} from '../../application/use-cases/get-training-load-summary.use-case';

const inputSchema = z.object({
  weeks: z.number().int().positive().max(26).describe('Number of weeks to look back from today'),
});

@Injectable()
export class TrainingLoadSummaryTool
  implements McpTool<GetTrainingLoadSummaryInput, GetTrainingLoadSummaryOutput>
{
  name = 'get_training_load_summary';
  description =
    'CTL/ATL/TSB (fitness/fatigue/form) daily rollup plus weekly volume, computed server-side over N weeks. ' +
    'Use for "how has my training load trended" questions. For a list of individual sessions, use get_recent_activities instead.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: GetTrainingLoadSummaryUseCase) {}

  execute = withToolSpan(this.name, (input: GetTrainingLoadSummaryInput) => this.useCase.execute(input));
}
```

- [ ] **Step 6: Register in ApplicationModule and McpModule**

```ts
// src/application/application.module.ts
import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';
import { GetActivityDetailUseCase } from './use-cases/get-activity-detail.use-case';
import { GetWellnessTrendUseCase } from './use-cases/get-wellness-trend.use-case';
import { GetPlannedWeekUseCase } from './use-cases/get-planned-week.use-case';
import { GetTrainingLoadSummaryUseCase } from './use-cases/get-training-load-summary.use-case';

@Module({
  providers: [
    GetRecentActivitiesUseCase,
    GetActivityDetailUseCase,
    GetWellnessTrendUseCase,
    GetPlannedWeekUseCase,
    GetTrainingLoadSummaryUseCase,
  ],
  exports: [
    GetRecentActivitiesUseCase,
    GetActivityDetailUseCase,
    GetWellnessTrendUseCase,
    GetPlannedWeekUseCase,
    GetTrainingLoadSummaryUseCase,
  ],
})
export class ApplicationModule {}
```

```ts
// src/mcp/mcp.module.ts
import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';
import { TrainingLoadSummaryTool } from './tools/training-load-summary.tool';

@Module({
  imports: [ApplicationModule],
  providers: [
    RecentActivitiesTool,
    ActivityDetailTool,
    WellnessTrendTool,
    PlannedWeekTool,
    TrainingLoadSummaryTool,
  ],
  exports: [
    RecentActivitiesTool,
    ActivityDetailTool,
    WellnessTrendTool,
    PlannedWeekTool,
    TrainingLoadSummaryTool,
  ],
})
export class McpModule {}
```

- [ ] **Step 7: Run full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/application/use-cases/get-training-load-summary.use-case.ts src/application/use-cases/get-training-load-summary.use-case.spec.ts src/mcp/tools/training-load-summary.tool.ts src/application/application.module.ts src/mcp/mcp.module.ts
git commit -m "Add get_training_load_summary use-case (CTL/ATL/TSB) and MCP tool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 17: compare_periods (use-case + tool)

**Files:**
- Create: `src/application/use-cases/compare-periods.use-case.ts`
- Create: `src/application/use-cases/compare-periods.use-case.spec.ts`
- Create: `src/mcp/tools/compare-periods.tool.ts`
- Modify: `src/application/application.module.ts`, `src/mcp/mcp.module.ts`

**Interfaces:**
- Consumes: `IntervalsPort`, `Activity`, `DateRange`, `McpTool`, `withToolSpan`.
- Produces: `ComparePeriodsUseCase` (`execute(input: { periodA: { from: string; to: string }; periodB: { from: string; to: string } }): Promise<{ deltas: { distanceMeters: number; durationSeconds: number; trainingLoad: number; avgHeartRate: number | null } }>` — B minus A), `ComparePeriodsTool`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/application/use-cases/compare-periods.use-case.spec.ts
import { ComparePeriodsUseCase } from './compare-periods.use-case';
import { IntervalsPort } from '../ports/intervals.port';
import { Activity } from '../../domain/activity';

function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: 'a',
    date: '2026-09-01',
    name: 'Ride',
    sport: 'Ride',
    distanceMeters: 10000,
    durationSeconds: 1800,
    avgHeartRate: 140,
    avgPace: 100,
    trainingLoad: 40,
    ...overrides,
  };
}

describe('ComparePeriodsUseCase', () => {
  it('computes deltas as periodB minus periodA', async () => {
    const port = {
      getActivities: jest
        .fn()
        .mockResolvedValueOnce([makeActivity({ distanceMeters: 10000, durationSeconds: 1800, trainingLoad: 40, avgHeartRate: 140 })])
        .mockResolvedValueOnce([makeActivity({ distanceMeters: 30000, durationSeconds: 3600, trainingLoad: 90, avgHeartRate: 150 })]),
    } as unknown as IntervalsPort;
    const useCase = new ComparePeriodsUseCase(port);

    const result = await useCase.execute({
      periodA: { from: '2026-08-01', to: '2026-08-07' },
      periodB: { from: '2026-09-01', to: '2026-09-07' },
    });

    expect(result.deltas.distanceMeters).toBe(20000);
    expect(result.deltas.durationSeconds).toBe(1800);
    expect(result.deltas.trainingLoad).toBe(50);
  });

  it('returns null avgHeartRate delta when either period has no HR data', async () => {
    const port = {
      getActivities: jest
        .fn()
        .mockResolvedValueOnce([makeActivity({ avgHeartRate: null })])
        .mockResolvedValueOnce([makeActivity({ avgHeartRate: 150 })]),
    } as unknown as IntervalsPort;
    const useCase = new ComparePeriodsUseCase(port);

    const result = await useCase.execute({
      periodA: { from: '2026-08-01', to: '2026-08-07' },
      periodB: { from: '2026-09-01', to: '2026-09-07' },
    });

    expect(result.deltas.avgHeartRate).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test compare-periods.use-case`
Expected: FAIL

- [ ] **Step 3: Implement the use-case**

```ts
// src/application/use-cases/compare-periods.use-case.ts
import { Injectable } from '@nestjs/common';
import { IntervalsPort } from '../ports/intervals.port';
import { DateRange } from '../../domain/date-range';
import { Activity } from '../../domain/activity';

export interface PeriodInput {
  from: string;
  to: string;
}

export interface ComparePeriodsInput {
  periodA: PeriodInput;
  periodB: PeriodInput;
}

export interface PeriodDeltas {
  distanceMeters: number;
  durationSeconds: number;
  trainingLoad: number;
  avgHeartRate: number | null;
}

export interface ComparePeriodsOutput {
  deltas: PeriodDeltas;
}

function sumBy(activities: Activity[], select: (a: Activity) => number): number {
  return activities.reduce((sum, a) => sum + select(a), 0);
}

function avgHeartRate(activities: Activity[]): number | null {
  const withHr = activities.filter((a) => a.avgHeartRate !== null);
  if (withHr.length === 0) return null;
  return sumBy(withHr, (a) => a.avgHeartRate as number) / withHr.length;
}

@Injectable()
export class ComparePeriodsUseCase {
  constructor(private readonly intervals: IntervalsPort) {}

  async execute(input: ComparePeriodsInput): Promise<ComparePeriodsOutput> {
    const rangeA = DateRange.of(new Date(input.periodA.from), new Date(input.periodA.to));
    const rangeB = DateRange.of(new Date(input.periodB.from), new Date(input.periodB.to));

    const [activitiesA, activitiesB] = await Promise.all([
      this.intervals.getActivities(rangeA),
      this.intervals.getActivities(rangeB),
    ]);

    const hrA = avgHeartRate(activitiesA);
    const hrB = avgHeartRate(activitiesB);

    return {
      deltas: {
        distanceMeters: sumBy(activitiesB, (a) => a.distanceMeters) - sumBy(activitiesA, (a) => a.distanceMeters),
        durationSeconds: sumBy(activitiesB, (a) => a.durationSeconds) - sumBy(activitiesA, (a) => a.durationSeconds),
        trainingLoad: sumBy(activitiesB, (a) => a.trainingLoad ?? 0) - sumBy(activitiesA, (a) => a.trainingLoad ?? 0),
        avgHeartRate: hrA !== null && hrB !== null ? hrB - hrA : null,
      },
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test compare-periods.use-case`
Expected: PASS (2 tests)

- [ ] **Step 5: Implement the tool**

```ts
// src/mcp/tools/compare-periods.tool.ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { McpTool } from '../tool';
import { withToolSpan } from '../with-tool-span';
import {
  ComparePeriodsUseCase,
  ComparePeriodsInput,
  ComparePeriodsOutput,
} from '../../application/use-cases/compare-periods.use-case';

const periodSchema = z.object({ from: z.string(), to: z.string() });
const inputSchema = z.object({ periodA: periodSchema, periodB: periodSchema });

@Injectable()
export class ComparePeriodsTool implements McpTool<ComparePeriodsInput, ComparePeriodsOutput> {
  name = 'compare_periods';
  description =
    'Deltas (periodB minus periodA) in volume, load, and avg HR between two date ranges. ' +
    'Use for "compare this month to last month" style questions.';
  inputSchema = inputSchema;

  constructor(private readonly useCase: ComparePeriodsUseCase) {}

  execute = withToolSpan(this.name, (input: ComparePeriodsInput) => this.useCase.execute(input));
}
```

- [ ] **Step 6: Register in ApplicationModule and McpModule (final versions)**

```ts
// src/application/application.module.ts
import { Module } from '@nestjs/common';
import { GetRecentActivitiesUseCase } from './use-cases/get-recent-activities.use-case';
import { GetActivityDetailUseCase } from './use-cases/get-activity-detail.use-case';
import { GetWellnessTrendUseCase } from './use-cases/get-wellness-trend.use-case';
import { GetPlannedWeekUseCase } from './use-cases/get-planned-week.use-case';
import { GetTrainingLoadSummaryUseCase } from './use-cases/get-training-load-summary.use-case';
import { ComparePeriodsUseCase } from './use-cases/compare-periods.use-case';

const useCases = [
  GetRecentActivitiesUseCase,
  GetActivityDetailUseCase,
  GetWellnessTrendUseCase,
  GetPlannedWeekUseCase,
  GetTrainingLoadSummaryUseCase,
  ComparePeriodsUseCase,
];

@Module({
  providers: useCases,
  exports: useCases,
})
export class ApplicationModule {}
```

```ts
// src/mcp/mcp.module.ts
import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';
import { TrainingLoadSummaryTool } from './tools/training-load-summary.tool';
import { ComparePeriodsTool } from './tools/compare-periods.tool';

const tools = [
  RecentActivitiesTool,
  ActivityDetailTool,
  WellnessTrendTool,
  PlannedWeekTool,
  TrainingLoadSummaryTool,
  ComparePeriodsTool,
];

@Module({
  imports: [ApplicationModule],
  providers: tools,
  exports: tools,
})
export class McpModule {}
```

- [ ] **Step 7: Run full suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/application/use-cases/compare-periods.use-case.ts src/application/use-cases/compare-periods.use-case.spec.ts src/mcp/tools/compare-periods.tool.ts src/application/application.module.ts src/mcp/mcp.module.ts
git commit -m "Add compare_periods use-case and MCP tool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 18: Composition root and stdio bootstrap

**Files:**
- Modify: `src/app.module.ts`
- Create: `src/mcp/server.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `InfrastructureModule` (Task 9), `McpModule` and all 6 tools (Tasks 11–17), `McpTool` (Task 11), `toMcpError` (Task 11).
- Produces: a runnable stdio MCP server — `pnpm start` connects to Claude Code.

- [ ] **Step 1: Wire the composition root**

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { ApplicationModule } from './application/application.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [InfrastructureModule, ApplicationModule, McpModule],
})
export class AppModule {}
```

- [ ] **Step 2: Implement the MCP server bootstrap**

```ts
// src/mcp/server.ts
import { INestApplicationContext } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpTool } from './tool';
import { toMcpError } from './errors';
import { RecentActivitiesTool } from './tools/recent-activities.tool';
import { ActivityDetailTool } from './tools/activity-detail.tool';
import { WellnessTrendTool } from './tools/wellness-trend.tool';
import { PlannedWeekTool } from './tools/planned-week.tool';
import { TrainingLoadSummaryTool } from './tools/training-load-summary.tool';
import { ComparePeriodsTool } from './tools/compare-periods.tool';

function registerTool(server: McpServer, tool: McpTool<unknown, unknown>): void {
  server.tool(tool.name, tool.description, tool.inputSchema, async (input: unknown) => {
    try {
      const result = await tool.execute(input);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err) {
      const mapped = toMcpError(err);
      return { content: [{ type: 'text', text: JSON.stringify(mapped) }], isError: true };
    }
  });
}

export async function startMcpServer(app: INestApplicationContext): Promise<void> {
  const server = new McpServer({ name: 'intervals-icu-mcp', version: '0.1.0' });

  registerTool(server, app.get(RecentActivitiesTool));
  registerTool(server, app.get(ActivityDetailTool));
  registerTool(server, app.get(WellnessTrendTool));
  registerTool(server, app.get(PlannedWeekTool));
  registerTool(server, app.get(TrainingLoadSummaryTool));
  registerTool(server, app.get(ComparePeriodsTool));

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

- [ ] **Step 3: Wire main.ts**

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { startMcpServer } from './mcp/server';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false, // stdout is reserved for the MCP protocol; nothing else may write to it
  });
  await startMcpServer(app);
}

bootstrap();
```

- [ ] **Step 4: Verify the app boots without a real API key failing at startup**

Run: `pnpm build`
Expected: succeeds. (Startup itself only fails once a tool that needs `INTERVALS_API_KEY` is actually invoked — `ApiKeyCredentialProvider.getApiKey()` throws lazily, not at boot, since Nest only instantiates `IntervalsHttpAdapter` when first injected. Confirm this by checking `IntervalsHttpAdapter`'s constructor does not call `getApiKey()` itself — it doesn't, per Task 9's implementation.)

- [ ] **Step 5: Run full test suite one more time**

Run: `pnpm test`
Expected: PASS — all unit and contract tests from every prior task green.

- [ ] **Step 6: Commit**

```bash
git add src/app.module.ts src/mcp/server.ts src/main.ts
git commit -m "Wire composition root and stdio MCP server bootstrap

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Task 19: Manual smoke test and README

**Files:**
- Create: `README.md`

**Interfaces:**
- None — this task is verification and documentation, not new production code.

- [ ] **Step 1: Write a minimal README**

```markdown
# intervals-icu-mcp

An MCP server exposing intervals.icu training data to Claude Code, built
with NestJS in a hexagonal (ports & adapters) architecture.

See `intervals-mcp-blueprint.md` for the full project plan and
`docs/superpowers/specs/2026-09-13-phase1-nestjs-hexagonal-design.md`
for the Phase 1 design.

## Setup

1. `pnpm install`
2. Copy `.env.example` to `.env` and fill in `INTERVALS_API_KEY` from
   https://intervals.icu -> Settings -> Developer.
3. Optionally run `pnpm fixtures:record` to refresh `fixtures/*.json`
   with your own real data (contract tests already pass against the
   committed sample fixtures).
4. `pnpm build && pnpm test` to verify.

## Running

`pnpm start` runs the MCP server over stdio. Point Claude Code's MCP
config at this command to use the 6 tools:
`get_recent_activities`, `get_activity_detail`, `get_wellness_trend`,
`get_planned_week`, `get_training_load_summary`, `compare_periods`.
```

- [ ] **Step 2: Manual smoke test against Claude Code**

Add this project as an MCP server in Claude Code's config (stdio command: `pnpm --dir <path to this repo> start`, or `node dist/main.js` after `pnpm build`), with your real `.env` in place. From a Claude Code session, invoke each of the 6 tools at least once against your real intervals.icu data and confirm each returns a sensible, capped payload (no raw 100+ field dumps, no unhandled errors). This step is manual — there is no automated check for it — but it is the Phase 1 deliverable per the spec ("you're querying your own training data from Claude Code").

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Add README with setup and smoke-test instructions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Cajqo44tR9p8P1WXt8qhVz"
```

---

## Definition of Done

- [ ] `pnpm build` and `pnpm test` both pass with zero failures.
- [ ] All 6 tools (`get_recent_activities`, `get_activity_detail`, `get_wellness_trend`, `get_planned_week`, `get_training_load_summary`, `compare_periods`) are registered and covered by unit tests.
- [ ] Contract tests validate zod schemas + mappers against fixtures for activities, activity detail, wellness, and planned workouts.
- [ ] `.env` is gitignored; `.env.example` documents both required vars; no secret is committed.
- [ ] Manual smoke test against a real Claude Code session (Task 19, Step 2) has been performed by the user with their real API key.

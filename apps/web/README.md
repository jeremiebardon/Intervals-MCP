# @intervals/web

The StrideVolt web client: design system, login + onboarding, and the training
dashboard. **Mock data only** — it does not talk to the agents server or
intervals.icu. Every request is served by MSW.

## Running it

```bash
pnpm --filter @intervals/web start:dev   # http://localhost:3000
```

`.env.development` sets `NEXT_PUBLIC_API_MOCKING=enabled`, which starts the MSW
service worker. Without it the app renders but every request 404s.

Demo credentials: `alex@stridevolt.test` / `correct-horse`.
The only Intervals.icu key the mock accepts is `k9x2000000000000f3a`; anything
else exercises the invalid-key state.

## Testing

```bash
pnpm --filter @intervals/web test        # Jest + React Testing Library
pnpm --filter @intervals/web test:e2e    # Maestro, needs start:dev running
```

E2E also has `test:e2e:tablet` (834) and `test:e2e:mobile` (390).

## Things that look wrong but are deliberate

Each of these cost time to discover; please don't "fix" them without reading
the reason.

**`jest.config.mjs`, not `.ts`, and not inlined in `package.json`.** The other
packages inline their Jest config, but `next/jest` exports a function returning
an async config factory, which JSON can't express. `.mjs` rather than `.ts`
because Jest 30 needs `ts-node` for TS configs and its native type-stripping
path is broken on Node 24 + CJS.

**`testEnvironment: 'jest-fixed-jsdom'`.** Plain `jest-environment-jsdom`
breaks MSW v2 twice over: it replaces Node globals MSW needs (`fetch`,
`Response`, `TextEncoder`, `ReadableStream`, `BroadcastChannel`) and its
browser export conditions make `msw/node` resolve to the *browser* build.

**Tests run with `--experimental-vm-modules`.** `msw@2` pulls an ESM-only
transitive dependency (`rettime`). Jest only enables native `require(esm)` when
`vm.SourceTextModule` exists, which needs that flag. Hence the scripts call
`node --experimental-vm-modules node_modules/jest/bin/jest.js` rather than
plain `jest` — an inline `NODE_OPTIONS=` prefix does not work when pnpm runs
scripts through cmd.exe on Windows.

**Forms use controlled inputs, never `new FormData(event.currentTarget)`.**
`jest-fixed-jsdom` restores Node's undici `FormData`, which cannot take an
`HTMLFormElement`.

**`MswProvider` memoises `worker.start()` in a module-level promise.** React
double-invokes effects in development; a second `start()` throws "cannot
configure an already enabled network". It also fails open, so a broken mock
layer surfaces as failed requests rather than a permanently blank page.

**All data fetching is in Client Components.** See ADR-0001 — the service
worker cannot see RSC server-side fetches, and Jest cannot render async Server
Components.

**`agentRules: false` in `next.config.ts`.** Next 16 otherwise generates its
own `AGENTS.md`/`CLAUDE.md` here, which would compete with the repo's.

### Maestro gotchas

- **Do not add `enabled: true` to a `tapOn`.** Maestro's *web* hierarchy does
  not report an enabled attribute, so the selector silently never matches,
  despite what the docs suggest. Assert on the resulting screen instead.
- **Maestro maps `aria-label` onto `resource-id`**, so an element with only an
  accessible name is selected with `id:`, not by text. The availability slot
  chips rely on this — their visible text repeats across all seven rows.
- Match the design's typographic apostrophes (`'`, U+2019) in assertions.
- Pass a tall `--screen-size` (e.g. `1440x1250`); browser chrome eats ~150px
  and the dashboard otherwise clips.

### shadcn

`components.json` points at `src/shared/ui`. shadcn emits double quotes while
this repo's Prettier config is `singleQuote` and `prettier/prettier` is an
*error*, so every generated component fails lint until formatted:

```bash
pnpm dlx shadcn@4.21.0 add <component> -c apps/web && pnpm format
```

## Known design-file discrepancies

The Figma light (`2:6095`) and dark (`2:6337`) dashboards disagree, and this
implementation follows the **light** frame, which is the one the work was
specified against:

- Dark adds a "+ Log workout" button to the top bar; light has only search and
  notifications.
- Dark has three sidebar nav items; light has four (including Coach).
- Dark renders the "KEY" tag as a filled pill; light renders it as plain brand
  text.

The theme toggle in the top bar is **not** in either frame. It was added
because both themes were in scope and there is otherwise no way to reach dark
mode.

See also the audit frame (`19:5`), which records drift in the documentation
frames — spacing off the 4pt rhythm, 18 font sizes against a 14-style ramp,
three near-duplicate shadows. Tokens here come from the Figma *variables*, not
from measurements taken off those frames.

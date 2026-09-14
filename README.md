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

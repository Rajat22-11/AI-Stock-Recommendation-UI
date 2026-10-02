## Why

The paper tracker in Supabase now holds real trades (8 fills, 4 stop-outs, 4 open, 2 pending), but the only way to see P&L is ad hoc SQL or a run report. A single public, read-only page answers "how is the paper book doing?" at a glance. The ledger also needs a few small fixes first: it mislabels positions too small to buy one share as "insufficient cash", the equity curve has no starting row, and runs can create a second label for an unchanged skill file.

## What Changes

- Paper capital stays at ₹10,00,000 and no replay is run. The page reads capital from `config.paper_capital`, so a later capital change needs no code edit. `fill_rules` and the stop formula are unchanged.
- The ledger skips an entry whose planned position size is below one share's price, with the reason `size_below_1_share` (e.g. APARINDS at ~₹17,600 against a ~₹15,000 position at a smaller capital), and keeps "insufficient cash" for real cash shortfalls. It never errors.
- `v_equity_daily` starts with a cash-only row (equity = capital) the day before the first fill and has a row for every trading session through `processed_through`, holding cash flat after positions close.
- `v_trade_stats` gains a readable `dimension` column (`overall`, `verdict`, `why_grade`, `setup`, `skill_version`, `verdict_why_grade`).
- Protocol step 1 changes to look up skill versions by sha256 first and reuse that label. The existing duplicate label (`2026-10-01-8169f728` / `2026-10-02-8169f728`) is left in place for v1; signals stay append-only and are never edited.
- `anon` and `authenticated` lose INSERT, UPDATE, DELETE and TRUNCATE on the public schema (including default privileges for new tables). SELECT stays. This happens only after confirming nothing writes with the anon key.
- New Next.js (App Router, TypeScript) app: one public, read-only page with a summary row, equity curve, open positions (near-stop highlight at 3%), closed trades, and pending entries with their windows. It reads with the anon key on the server only, has no auth, and makes no writes. Hosted on Render's free tier.

## Capabilities

### New Capabilities
- `paper-ledger`: Paper capital, the share-size skip rule, the equity time series, and the trade-stats dimension label, as exposed by the ledger and its views.
- `tracker-access`: Which database roles may read or write the tracker, and how the UI connects (anon key, server-side, read-only).
- `skill-versioning`: How runs choose and reuse a `skill_versions` label, and the rule that labels are never fixed by editing signals.
- `pnl-dashboard`: The single public page showing paper P&L, its sections, formatting and empty states, and its deployment on Render.

### Modified Capabilities
<!-- None: no specs exist yet in openspec/specs/. -->

## Impact

- **Supabase project `moqyzjrnqzqzrxiuqyuf`:** migrations to `_ledger_pending`, `v_equity_daily` and `v_trade_stats`; grant changes; a `config.protocol` text update. No ledger replay, no capital change, no `fill_rules` change, and no edits to `signals` or `runs`.
- **Scheduled Claude runs:** they follow the updated protocol step 1. They are unaffected by the revoked grants because they write through the Supabase MCP, not the anon key.
- **New code:** the Next.js 16 app scaffolded in `paper-pnl-tmp/`, to be moved to the repository root. Dependencies: `@supabase/supabase-js`, `server-only`. No chart library, ORM or state library.
- **Hosting:** a new Render web service (free tier, Node 24) with env vars `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
- **Out of scope for v1:** auth, position detail pages and price charts, price backfill, ledger rule hashing, the skill-version comparison page, CSV export, and the "Recompute ledger" button.

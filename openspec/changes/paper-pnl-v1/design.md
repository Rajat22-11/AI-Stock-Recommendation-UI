## Context

- The ledger is plain SQL in Supabase project `moqyzjrnqzqzrxiuqyuf`. `process_ledger(p_through)` deletes and rebuilds `positions`, `events` and `marks` from `signals` and `price_bars` on every call. Position and event ids therefore change on every replay (today positions are ids 17–26 for 10 rows).
- `_ledger_pending` computes `v_qty = floor(least(capital * planned_size_pct / 100, cash) / fill)`. When `v_qty < 1` it skips with `insufficient cash`, so a stock priced above the per-position budget is mislabelled as a cash problem. It never errors.
- `v_equity_daily` builds its dates from `select distinct mark_date from marks`. Marks exist only for open positions and on exit days, so the series has no starting row and stops when the book goes flat.
- `v_trade_stats` exposes `GROUPING(verdict, why_grade, setup, skill_version)` as an opaque integer, `grp`.
- `signals` is append-only by trigger (`signals_append_only` blocks UPDATE and DELETE). `runs.skill_version` and `signals.skill_version` are foreign keys to `skill_versions(version)`. Label `2026-10-02-8169f728` is used by 1 run and 29 signals.
- RLS policies are read-only (`using (true)` for `anon` and `authenticated`), but both roles hold table-level INSERT, UPDATE, DELETE and TRUNCATE grants (Supabase defaults).
- The Next.js 16.3.8 scaffold (TypeScript, App Router, `src/`, Tailwind v4, ESLint) sits in `paper-pnl-tmp/` because `create-next-app` would not run in the non-empty root.

## Goals / Non-Goals

**Goals:**
- Make the DB fixes as small, separate migrations that leave today's figures unchanged and need no replay.
- A server-rendered page with essentially no client JavaScript, one Supabase client and five reads.

**Non-Goals:**
- Changing fill, stop, trim or cost rules (including the skill/ledger stop disagreement noted in review 2).
- Any client-side data fetching, routing beyond `/`, or a generated-types pipeline.

## Decisions

### D1. Share-size skip: one extra branch in `_ledger_pending`
Before the existing `v_qty < 1` check, test `floor(capital * planned_size_pct / 100 / v_fill) < 1`. If it holds, set `status = 'skipped'`, `exit_reason = 'size_below_1_share'` and insert a `skip` event whose rule states the planned size and the fill price. The existing branch stays for real cash shortfalls.
- *Alternative:* round up to 1 share. Rejected because it breaks the cap and risk rules.
- *Alternative:* skip at position creation in `process_ledger`. Rejected because the fill price isn't known until the bar.
- `skip` is already allowed by `events_event_type_check`. `exit_reason` has no check constraint. `config.fill_rules` text gains the new skip reason.

### D2. `v_equity_daily`: a date spine instead of mark dates
Replace the `dates` CTE with:
1. `first_fill = min(fill_date)` from positions
2. the baseline date `first_fill - 1`
3. the distinct `price_bars.bar_date` values in `[first_fill, processed_through]`
4. a fallback of the single date `processed_through` when there are no fills.

For each date, take each position's latest mark on or before that date (the same lateral as today). Closed positions' last mark has `qty_open = 0`, so they add zero invested and zero market value. Realized P&L stays the cumulative sum of `events.pnl`. The baseline row has empty aggregates, coalesced to 0. Column names, order and types stay the same, so `v_pnl_monthly` and `v_pnl_yearly` keep working: the baseline row lands in the first fill's month or the month before, and month-end selection is unaffected.
- *Alternative:* a calendar-day spine. Rejected because weekends and holidays would add flat rows and noise.
- *Alternative:* have the ledger write marks for flat days. Rejected because it's a larger change to `process_ledger`.

### D3. `v_trade_stats.dimension`: an appended column
`create or replace view` with the same columns plus `dimension` last, using a CASE on the grouping: 15 → `overall`, 7 → `verdict`, 11 → `why_grade`, 13 → `setup`, 14 → `skill_version`, 3 → `verdict_why_grade`. Appending keeps `create or replace` legal and leaves existing readers unaffected. `grp` stays.

### D4. Skill labels: fix the protocol, leave existing rows alone
`config.protocol` step 1 is rewritten to look up `skill_versions` by sha256 first and reuse its label, creating a label only for a new hash. The existing duplicate stays for v1.
- *Rejected:* merging into `2026-10-01-8169f728`. It meant disabling `signals_append_only` to edit 29 signals, and signals must never be edited.
- *Declined at apply time:* deleting the unreferenced `2026-10-01-8169f728` and adding a partial unique index on `sha256`. It can be revisited as its own change, since it touches no signal.

### D5. Grants: revoke writes now and for future tables
```
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke insert, update, delete, truncate on tables from anon, authenticated;
```
Views are covered by "all tables". SELECT and the existing RLS policies are untouched. Pre-check: the repo has no scripts, and the Supabase API logs for the last 7 days should show no POST, PATCH or DELETE from the `anon` role. The scheduled runs use the Supabase MCP (a privileged role), so they're unaffected.

### D6. Migration order, and no replay
1. grants (D5)
2. `_ledger_pending` (D1)
3. `v_equity_daily` (D2)
4. `v_trade_stats` (D3)
5. `config.protocol` text (D4)

Capital stays at ₹10,00,000, and `fill_rules` and the stop formula are untouched, so no replay is run. D1 only affects future replays. D2 and D3 are views, so they apply to today's data immediately and leave all existing figures unchanged.

### D7. App: server components, one module for reads
- `src/lib/supabase.ts` imports `server-only` and creates a client from `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, with no `NEXT_PUBLIC_` prefix so nothing reaches the bundle. It disables `persistSession` and `autoRefreshToken`.
- `src/lib/queries.ts` runs the five reads with `Promise.all`:
  - `v_equity_daily` ordered by `as_of`
  - `v_open_positions`
  - `v_positions` where status is closed, ordered by `exit_date` descending
  - `positions` where status is pending, with the signal embedded (`signals(verdict, why_grade, retro_seeded)`), ordered by `window_start`
  - `config` where key is `processed_through`.
  Any `error` throws.
- `src/app/page.tsx` is an async server component that calls `await connection()` (from `next/server`, the Next 16 way to require a real request) before reading. Each request reads fresh data. On free-tier Render, ISR would be lost on every spin-down anyway.
- `src/app/error.tsx` shows "Tracker database is unreachable".
- Row keys use `signal_id`.
- *Alternative:* `supabase gen types`. Deferred: the views type every column as nullable, and five hand-written row types are less work for v1.

### D8. Equity curve: a server-rendered SVG, no chart library
The SVG is a `<polyline>` scaled to the min and max equity, with first and last date labels and a dashed capital line. It ships no client JavaScript and adds no dependency, and it handles 1 to a few hundred points. A chart library (lightweight-charts) waits until a feature needs interaction or candles.
- Scaling points to pixels is presentation, not trading math.

### D9. Formatting helpers
`src/lib/format.ts`:
- `inr(n)` uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })` for tiles and two decimals in tables.
- `pct(n)` returns a signed value with two decimals.
- `day('2026-09-28')` splits the string and maps the month name, with no `Date` object, so there's no timezone shift.
- Timestamps use `timeZone: 'Asia/Kolkata'`.

PostgREST may return `numeric` as a number or a string, so helpers accept both via `Number(x)`.

### D10. Near-stop rule
`const NEAR_STOP_PCT = 3`. A row is highlighted when `dist_to_stop_pct <= 3`. This compares a DB value to a constant and computes nothing.

### D11. Render
- Node web service, free plan, `.node-version` set to `24`, `"engines": { "node": "24.x" }`.
- Build command `npm ci && npm run build`. Start command `npm start` (`next start` honours `PORT`).
- Env vars: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
- No `output: 'standalone'`, no health-check route, no pinger.
- A `render.yaml` blueprint is committed so the setup is reproducible.

## Risks / Trade-offs

- **[The duplicate skill label remains]** → Grouping by `skill_version` splits one skill into two labels. v1 shows no per-version stats, so nothing visible depends on it.
- **[A revoked grant breaks an unknown writer]** → Check the API logs first. Rollback is `grant insert, update, delete on ... to anon` (no data is affected).
- **[Skipped positions are invisible]** → At ₹10L the `size_below_1_share` skip only applies to stocks above ~₹1,00,000 (full size) or ~₹50,000 (reduced). Skipped positions don't appear on the v1 page; see Open Questions.
- **[Cold starts of 30–60 s on the free tier]** → Accepted by the user.
- **[Anyone can read the data with the anon key]** → Accepted (public read is fine). Writes are closed by D5.
- **[Next 16 conventions differ from older docs]** → The scaffold's `AGENTS.md` points to `node_modules/next/dist/docs`. Read the relevant guide before writing code.

## Migration Plan

1. Move the scaffold from `paper-pnl-tmp/` to the repo root (needs user approval, because it deletes the temp `.next` and the folder).
2. Apply DB migrations D6 steps 1–5 via Supabase migrations, verifying each spec scenario with SQL.
3. Build the page locally against the live DB (`.env.local`).
4. Push the repo to GitHub, create the Render service from `render.yaml`, set the env vars and verify `/`.

Rollback: DB steps are independently reversible as noted above. The UI has no state; deleting the Render service removes it.

## Open Questions

- Should skipped and expired positions (e.g. `size_below_1_share`) get a small "Not filled" list on the page later? It isn't requested for v1, and adding it later doesn't change this design.

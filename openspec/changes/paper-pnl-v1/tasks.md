## 1. Project setup

- [x] 1.1 Move the Next.js scaffold from `paper-pnl-tmp/` to the repo root (ask the user to approve deleting `paper-pnl-tmp/.next` and the empty folder), then confirm `npm run build` passes at the root
- [x] 1.2 Read the relevant Next 16 guides in `node_modules/next/dist/docs` (per the scaffold's `AGENTS.md`): server components, `dynamic`, `error.tsx`
- [x] 1.3 Add dependencies `@supabase/supabase-js` and `server-only`; add `.node-version` (24) and `"engines": { "node": "24.x" }`
- [x] 1.4 Add `.env.example` with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; create a local `.env.local` (gitignored) with the project URL and publishable key

## 2. Database: access lockdown

- [x] 2.1 Check Supabase API logs (last 7 days) for POST, PATCH or DELETE requests made with the anon role, and confirm with the user that no script writes with the anon key. Stop if any are found
- [x] 2.2 Migration `revoke_public_writes`: revoke INSERT, UPDATE, DELETE and TRUNCATE on all tables in `public` from `anon` and `authenticated`, and alter the default privileges for role `postgres` the same way
- [x] 2.3 Verify with `has_table_privilege` that every table and view is SELECT-only for `anon` and `authenticated`

## 3. Database: ledger and views

- [x] 3.1 Record the current `process_ledger` state (positions by status, realized P&L, equity rows) for the record
- [x] 3.2 Migration `ledger_size_below_1_share`: in `_ledger_pending`, skip with `exit_reason = 'size_below_1_share'` and a `skip` event when the planned size buys less than one share, keeping `insufficient cash` for cash shortfalls
- [x] 3.3 Migration `equity_daily_spine`: rewrite `v_equity_daily` with the date spine (baseline day before first fill, every `price_bars` session through `processed_through`, single-row fallback with no fills), keeping columns and types unchanged
- [x] 3.4 Migration `trade_stats_dimension`: recreate `v_trade_stats` with the `dimension` column appended
- [x] 3.5 Check `v_pnl_monthly` and `v_pnl_yearly` still return sensible rows on the new equity view

## 4. Database: skill-version protocol

- [x] 4.1 ~~Merge the duplicate skill label~~. Deferred out of v1: both the merge into `2026-10-01-8169f728` (which needed the append-only trigger disabled) and the trigger-free dedupe keeping `2026-10-02-8169f728` were declined. Per the user, fall back to no merge; `signals_append_only` was never disabled
- [x] 4.2 ~~Verify the merge~~. Not applicable (see 4.1); confirmed no signal or run row changed and the trigger is enabled (`tgenabled = 'O'`)
- [x] 4.3 ~~Update `config.protocol` step 1 to: look up `skill_versions` by sha256 first and reuse that label; create a new label only for a new hash, dated the day it first runs~~. Skipped for v1 by the user; the protocol text is unchanged
- [x] 4.4 ~~Update `config.fill_rules`~~. Dropped: the user asked that `fill_rules` stay untouched

## 5. Database: capital (no change in v1)

- [x] 5.1 ~~Set `config.paper_capital` to 150000 and replay~~. Dropped: capital stays at ₹10,00,000 and no replay is run. `fill_rules` and the stop formula stay unchanged
- [x] 5.2 Verify the remaining paper-ledger spec scenarios with SQL on today's data: baseline row the day before the first fill with equity = `paper_capital`; one row per session through `processed_through`; `v_trade_stats` has one `overall` row

## 6. Data layer

- [x] 6.1 `src/lib/supabase.ts`: server-only client from `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, with no session persistence and no token refresh
- [x] 6.2 `src/lib/types.ts`: hand-written row types for the five reads (`EquityRow`, `OpenPosition`, `ClosedTrade`, `PendingEntry`, freshness)
- [x] 6.3 `src/lib/queries.ts`: `getDashboard()` running the five reads in parallel (equity, open, closed, pending with embedded signal, processed_through), throwing on any error
- [x] 6.4 `src/lib/format.ts`: `inr`, `pct`, `day` (string-based, no `Date`) and an IST timestamp helper, accepting number or string input
- [x] 6.5 Unit-check the formatters: 1000000 → "₹10,00,000", 150000 → "₹1,50,000", -1234.5 → "-₹1,234.50", "2026-09-28" → "28 Sep 2026", -2.333 → "-2.33%". Use a small node script or test runner, whichever is quickest

## 7. Page

- [x] 7.1 `src/app/layout.tsx`: title "Paper P&L", minimal Tailwind base styles, light and dark aware
- [x] 7.2 `src/app/page.tsx`: async server component, `await connection()` for per-request rendering (approved in place of `dynamic = 'force-dynamic'`), calls `getDashboard()`
- [x] 7.3 Summary row: capital, equity, realised, unrealised, return % from the latest equity row, plus the "Data through" date. Capital comes from the database (`v_equity_daily.capital`, i.e. `config.paper_capital`), never a hardcoded amount
- [x] 7.4 `EquityCurve` server component: SVG polyline, dashed capital line, first and last date labels, and a single-row note
- [x] 7.5 Open positions table: symbol, fill date and price, last close, P&L %, stop, distance to stop; highlight at `NEAR_STOP_PCT = 3`; "No open positions" empty state
- [x] 7.6 Closed trades table: symbol, entry date and price, exit date and price, reason, realised P&L (signed, coloured), newest first; "No closed trades yet"
- [x] 7.7 Pending entries table: symbol, verdict, entry zone, window, stop; "No pending entries"
- [x] 7.8 "retro" badge on rows whose signal is retro-seeded; all row keys use `signal_id`
- [x] 7.9 `src/app/error.tsx`: "Tracker database is unreachable" message
- [x] 7.10 Remove the scaffold's demo content and assets from `page.tsx` and `public/`

## 8. Verify locally

- [x] 8.1 `npm run lint` and `npm run build` pass
- [x] 8.2 `npm start`, open `/`, and check every figure against the corresponding SQL row (spot-check equity, one open position, one closed trade, one pending entry)
- [x] 8.3 Search `.next/static` for the Supabase key and "service_role"; neither is present
- [x] 8.4 Temporarily point `SUPABASE_URL` at an invalid host and confirm the error page shows

## 9. Deploy to Render

- [x] 9.1 Add `render.yaml`: web service, free plan, Node runtime, build `npm ci && npm run build`, start `npm start`, env vars `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (`sync: false`)
- [ ] 9.2 With the user: initialise git, push to a GitHub repo, create the Render service from the blueprint, and set both env vars
- [ ] 9.3 Open the public URL with no credentials and confirm the page matches the local render; note the cold-start time

## Why

The dashboard only shows what the paper ledger did with a signal (pending, open, closed). It does not show what the skill actually suggested this month or why. A signal the ledger skipped for cash, or one still waiting for its window, cannot be reviewed from the page. A read-only list of this month's suggestions, with the reasoning stored next to each one, lets the skill's calls be judged on their own, apart from the paper book's cash.

## What Changes

- A new "Suggestions this month" section directly below the summary tiles, above the equity curve.
- Source: `signals` with verdict `ENTRY` or `ENTRY_REDUCED`, `provisional = false`, not superseded by another signal, and `signal_date` in the current calendar month (Asia/Kolkata), newest first. The list never filters on cash, positions or ledger status.
- Columns: symbol, signal date, verdict (ENTRY_REDUCED labelled as half size), entry zone, stop, trim, size %, entry window, and paper status.
- Paper status comes from `positions` joined on `signal_id`: pending, open, closed, expired, or skipped with its reason (e.g. "insufficient cash", "size_below_1_share"). A signal with no position row yet reads "not in ledger yet".
- A "Why" expander on each row: the why-grade badge and `why_text`, then a checklist from stored columns: close vs pivot (%), `vol_mult` vs 2×, `correction_pct`, `dist_sma_pct` with `sma13_rising`, `base_range_pct`, `close_loc`, `liquidity_tier`. A missing value shows "n/a", never zero.
- A collapsed "Watchlist alerts" block: the latest `WAIT_ALERT` signal per symbol this month, with trigger price (`alert_trigger`) and required volume (`req_vol_abs`).
- A "retro" badge on retro-seeded signals in both lists.
- A section footer: "Paper-trading signals, not investment advice."
- No database change: no new table, view, column, function or grant.

## Capabilities

### New Capabilities
- `signal-suggestions`: the read-only monthly suggestions list, its why expander and checklist, the paper-status join, and the watchlist-alerts block on the dashboard page.

### Modified Capabilities
<!-- None. `pnl-dashboard` is still an unarchived delta in `paper-pnl-v1` (openspec/specs is empty), so this change states its one scoped exception to that capability's "figures come from the database" rule inside the new spec instead of modifying it. -->

## Impact

- `src/lib/queries.ts`: new read(s) of `signals` with `positions` embedded; no change to the existing five reads.
- `src/lib/types.ts`: new row types for suggestions and watchlist alerts.
- `src/lib/format.ts`: an "n/a" formatting variant for checklist values.
- `src/app/page.tsx` and `src/components/`: the new section, built from server components and native `<details>` elements, so no client JavaScript is added.
- Supabase: read-only queries through the existing anon/publishable key. Schema, RLS and grants are unchanged.
- Depends on `paper-pnl-v1`, which should be archived first so `pnl-dashboard` exists in the main specs.

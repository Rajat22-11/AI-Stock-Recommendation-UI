## Context

- The page ([src/app/page.tsx](../../../src/app/page.tsx)) is one async server component. It calls `await connection()` and reads five queries through `getDashboard()` in [src/lib/queries.ts](../../../src/lib/queries.ts). It ships no client JavaScript beyond Next's runtime, and [src/app/error.tsx](../../../src/app/error.tsx) shows "Tracker database is unreachable" when a read throws.
- `signals` already stores everything the section needs: `verdict`, `provisional`, `retro_seeded`, `supersedes`, `why_grade`, `why_text`, `signal_close`, `pivot`, `alert_trigger`, `entry_low/high`, `stop`, `trim_price`, `size_pct`, `vol_mult`, `req_vol_abs`, `sma13_rising`, `dist_sma_pct`, `correction_pct`, `base_range_pct`, `close_loc`, `liquidity_tier`, `window_start/end`.
- `positions.signal_id` is a FK to `signals(id)` with a UNIQUE constraint, so each signal has at most one position. `positions.status` is one of `pending, open, closed, expired, skipped`. The `expired` value is not in the user's list, so the spec shows it as is.
- "Superseded" has no flag column. A signal is superseded when another row's `supersedes` points at it (self-FK `signals_supersedes_fkey`). No row uses it today.
- `WAIT_ALERT` has repeated rows per symbol (10 symbols have two), so the watchlist needs a latest-per-symbol pick.
- Live data on 2026-10-02: the qualifying October suggestions are SUNFLAG and BOSCH_HCIL (both ENTRY_REDUCED, pending). The 2026-09-25 batch falls in September and is correctly not listed.
- RLS allows anon SELECT on `signals` and `positions`. Writes are revoked (paper-pnl-v1 D5).

## Goals / Non-Goals

**Goals:**
- Add the section with two more reads and no database change.
- Keep the page server-rendered, with expanders as native `<details>` and no client components.

**Non-Goals:**
- Choosing a month (prev/next navigation), filters or sorting controls.
- Any view, RPC or column to precompute close-vs-pivot or "superseded". Ruled out by the no-schema-change constraint.
- Changing how the ledger sets stop or trim. The page only displays them.

## Decisions

### D1. Two new reads, run in parallel with the existing five
`getDashboard()` gains two queries in the same `Promise.all`:
1. **Month signals**: `signals` with `verdict in (ENTRY, ENTRY_REDUCED, WAIT_ALERT)`, `provisional = false`, `signal_date >= monthStart and < nextMonthStart`, ordered by `signal_date desc, id desc`. It selects only the displayed columns and embeds `positions(status, exit_reason, fill_date, stop_at_fill, trim_price)`.
2. **Superseded ids**: `signals.select('supersedes').not('supersedes', 'is', null)`. This returns the ids that some other signal replaces, and the page drops those from (1).

Splitting the month result by verdict into suggestions and alerts happens in `queries.ts`. Any `error` throws, as today.
- *Alternative:* an anti-join embed (`signals!supersedes(id)` filtered `is null`). Rejected because PostgREST self-referencing one-to-many embeds need a computed relationship, which is a schema change.
- *Alternative:* a separate `getSuggestions()` call from the page. Rejected because a single `Promise.all` keeps one failure path and one round of latency.
- The superseded read is global, not month-bounded: a superseding signal is always the same date or later, but this costs nothing at the table's size (tens of rows) and needs no date reasoning.

### D2. Month bounds from the IST date
A small helper in `src/lib/format.ts` (or a new `src/lib/dates.ts`) gets today's `YYYY-MM-DD` with `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })`. It then builds `monthStart = YYYY-MM-01` and `nextMonthStart` by string arithmetic on year and month, with no `Date` math on local time. The month label in the section title ("October 2026") comes from the same values.
- *Alternative:* the month of `config.processed_through`. Rejected because the user asked for the calendar month, and `processed_through` lags by a session, so on the 1st it would show last month.

### D3. Embedded position as one object
Because `positions.signal_id` is UNIQUE, PostgREST returns the embed as a single object or `null`. The row type declares `positions: PositionStatus | null`. If an array ever comes back, the reader normalises it with `Array.isArray(x) ? x[0] ?? null : x`, so a PostgREST version change can't break the page.

### D4. Stop and trim source
The spec requires DB values only. Use `positions.stop_at_fill` and `positions.trim_price` when `positions.fill_date` is not null. Otherwise use `signals.stop` and `signals.trim_price` with a small "planned" marker. Headers read "Stop (8% below fill)" and "Trim (+25%)".
- Today's data agrees: SUNFLAG's planned stop is 398.82 = 433.50 × 0.92, and its trim is 541.88 = 433.50 × 1.25. Structural-stop signals (e.g. ROLEXRINGS) differ from 8%. The header states the rule, and the value is whatever the DB holds.

### D5. Close-vs-pivot is the single UI-derived number
`(signal_close / pivot − 1) × 100` is computed in the checklist component and shown through `pct()`. It returns `null` (so "n/a") when either input is null or the pivot is 0. The spec records this as a scoped exception for explanatory display. No other checklist value is derived.
- *Alternative:* show close and pivot without a %. Rejected because the user asked for the %.
- *Alternative:* a view column. Rejected because it's a schema change.

### D6. "n/a" formatting
Existing helpers return "—" for null. Add `orNa(formatted: string)`, or an `na` option, so checklist cells render "n/a". Table columns elsewhere keep "—". Booleans (`sma13_rising`) and text (`liquidity_tier`, `why_grade`, `why_text`) use the same null rule. Pass/fail marks are rendered only when the input is non-null, and the comparisons are against UI constants: `VOL_THRESHOLD = 2`, close > pivot, `sma13_rising === true`. This matches the near-stop pattern (paper-pnl-v1 D10). The checklist text says "vs 2×" to match the request, even though some signals store `req_vol_mult = 3`. See Risks.

### D7. Components
- `src/components/Suggestions.tsx` (server component): the section, the table, the per-row `<details>` "Why" (rendered as a full-width second `<tr>` under each row, holding a `<details>`), the watchlist `<details>` and the footer line.
- The Why expander is placed in its own row so the table keeps the existing `Table`/`Td` styling and horizontal scroll. The summary cell shows "Why" plus the grade badge.
- A `WhyGrade` badge in `ui.tsx` reuses the `RetroBadge` chip style with a neutral tone per grade. It uses no colour-only meaning: the letter is always shown.
- Watchlist latest-per-symbol: walk the rows (already sorted by date then id, newest first) and keep the first row per symbol.

### D8. Page placement
`page.tsx` renders `<Suggestions …/>` between the summary `<section>` and the "Equity curve" `Section`. The existing page footer stays. The new disclaimer is the section's last line.

## Risks / Trade-offs

- **[`vol_mult` vs 2× disagrees with the signal's own `req_vol_mult` (3.0 for some)]** → The fail/pass mark follows the user's 2× rule, and `req_vol_mult` is shown beside it in muted text when it differs, so the gap is visible rather than hidden.
- **[Early in a month the list is empty]** → Expected. The empty state says "No suggestions this month". Suggestions from the last days of the previous month (e.g. the 25 Sep batch on 2 Oct) are not shown here, but their positions still show in the open/pending/closed tables.
- **[A month with many WAIT_ALERTs makes the page long]** → The block is collapsed by default.
- **[One more Supabase round trip's worth of data]** → Two small selects run in parallel with the existing five. There's no measurable effect on a cold start that already takes 30–60 s.
- **[`pnl-dashboard` is not yet in main specs]** → The close-vs-pivot exception is stated in `signal-suggestions`. Archive `paper-pnl-v1` before archiving this change so the two specs sit side by side.

## Migration Plan

UI-only. Build and verify locally against the live DB (`npm run build`, then load `/` and check the spec scenarios against today's data), then push. Render redeploys on push. Rollback is reverting the commit. No database step.

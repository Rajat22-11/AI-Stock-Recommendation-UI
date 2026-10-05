## Context

- Next 16 App Router, React 19, Tailwind 4, `@supabase/supabase-js`. The only page today is `src/app/page.tsx`. It is an async server component that calls `await connection()` and reads through `getDashboard()` in `src/lib/queries.ts`. `src/app/error.tsx` renders "Tracker database is unreachable".
- Theme tokens live in `src/app/globals.css` and follow `prefers-color-scheme`: a light palette, plus a dark palette in a media query. "Keep the dark theme" therefore means keeping both palettes and adding any new token to both.
- The working tree holds an uncommitted implementation of `monthly-suggestions`: `Suggestions.tsx`, `dates.ts`, and month/superseded reads in `queries.ts`. This change withdraws it (see proposal).
- Live data on 2026-10-05:
  - `v_suggestions`: 2 entry rows and 20 watch rows. Watch rows have no `signal_rationale`. `fundable_now = position_value <= latest cash`.
  - The 4 Oct fresh start removed the pilot positions. Signals 2, 3, 5, 6, 7 and 8 have `trade_reviews` rows but no position, and are in `signal_exclusions`. `v_trade_review` covers only the 4 current positions (2 open, 2 pending).
  - 0 closed positions. `v_rule_effectiveness` is empty. `v_signal_outcomes` returns are all null.
  - `price_bars`: 4 daily bars per symbol (28 Sep – 1 Oct). `events`: only `fill`.
  - `trade_reviews.tag` CHECK list: good_call, winner, valid_stop, whipsaw_tight_stop, gap_through_stop, missed_runner, avoided_loser, bad_entry, rule_violation, data_gap, removed_fresh_start, other. `v_trade_review.auto_tag` adds open, pending, expired, skipped, loser.
  - All 62 signals have `run_id`, and `v_signal_plan` has a row for every signal.
- Next 16: dynamic `params` is a `Promise` (`PageProps<'/trade/[signal_id]'>`), and `notFound()` must be called in the render path (checked in `node_modules/next/dist/docs/01-app/03-api-reference`).

## Goals / Non-Goals

**Goals:**
- Four routes, all server components with `await connection()`, one `Promise.all` per page, and one failure path.
- Client JavaScript limited to two leaf components: the equity tooltip and the candle crosshair.
- No DB objects. Every figure is a stored value, except the W-FRI candle aggregation and axis ticks.

**Non-Goals:**
- Filters, sorting controls, date pickers, pagination (row counts are in the tens).
- Any write, including a UI to edit review tags.
- Indicators on the chart (SMA13, volume bars). These can be added later from the same rows.
- Backfilling `price_bars`. That is the price agent's job, outside this repo.

## Decisions

### D1. One reader per page in `queries.ts`
Readers: `getDashboard()` (extended), `getTrade(signalId)`, `getReview()`, `getRuns()`.
- Each reader runs its selects in one `Promise.all` and throws on any `error`.
- Columns are selected explicitly, never `*`.
- `getTrade` returns `null` when `v_signal_plan` has no row, and the page calls `notFound()`.
- Reads per page:
  - `/`: existing five reads, plus `v_book_risk` (`maybeSingle`) and `v_suggestions`. The two `monthly-suggestions` reads are dropped.
  - `/trade/[id]`: `v_signal_plan`, `signals` (why_grade, why_text, pivot, setup, stage, run_id), `signal_rationale`, `v_signal_checklist`, `v_trade_review`, `trade_reviews`, `positions` (fill, exit, stop_current), `events`, `signal_exclusions`.
    - `price_bars` needs the symbol, so it is a second step after the plan row: one follow-up query filtered by `symbol` and `bar_date >= latest − 371 days`.
  - `/review`: `v_trade_review`, `trade_reviews` with `signals(symbol, verdict, signal_date)` embedded, `positions(signal_id, status)`, `signal_exclusions(signal_id)`, `v_signal_outcomes`, `v_rule_effectiveness`, `v_trade_stats`.
  - `/runs`: `v_run_log`, plus `v_signal_plan(signal_id, run_id, symbol, verdict)`.
- *Alternative:* a client data layer or route handlers. Rejected because server components with the anon key already meet the read-only, no-secret-to-browser rule (tracker-access).

### D2. Responsive `DataList` instead of `Table`
`DataList<T>({ rows, columns, rowKey, href?, highlight? })`, where each column is `{ label, cell(row), align, primary?: boolean }`.
- It renders a `<table>` inside `hidden sm:block`, and a card list inside `sm:hidden`.
- A card's first line shows the `primary` columns (symbol, P&L, stop), and the rest go in a `dl` grid.
- Rendering both is cheap at these sizes and needs no JS or media-query hook.
- *Alternative:* restyling the table with CSS (`display:block` rows plus `data-label`). Rejected because it is fragile with `<details>` rows and hard to give a distinct primary line.
- *Alternative:* keeping horizontal scroll. Rejected; this is the reported bug.

### D3. Popover tooltips without JS
`InfoTip` renders a `<button popovertarget=id>` with an element using `popover="auto"`. The HTML popover API gives tap, keyboard, Esc and light-dismiss natively, in Chrome, Safari 17+ and Firefox 125+.
- Positioning is a simple fixed or below-trigger style. Anchor positioning is not used because it is not yet in all browsers.
- Used by the RETRO badge, the not-fundable badge and the heatmap legend.
- *Alternative:* `title=`. Rejected because it doesn't work on touch.

### D4. Tabs through `searchParams`
`/?ideas=watch` selects Watch, and no parameter means Entry. The page reads `searchParams` (a Promise in Next 16) and renders two `<Link>` tabs with `aria-current`. The page is already dynamic, so this costs nothing and makes the tab shareable (spec).
- *Alternative:* CSS-only radio tabs. Rejected because they aren't linkable and are awkward for screen readers.

### D5. Equity curve: HTML axis plus a client tooltip island
- The server computes about 4 "nice" ticks (1, 2 or 2.5, or 5 × 10ⁿ steps) spanning `[yMin, yMax]`. Labels are absolutely positioned HTML at `top: y(v)/H`, so text stays crisp while the SVG keeps `preserveAspectRatio="none"`.
- The tooltip is `EquityTooltip` (`"use client"`). It receives `{ as_of, equity, return_pct }[]` and the same x mapping, and handles pointer and touch by mapping the nearest index from `offsetX / width`.
- It is focusable (`tabIndex=0`): left and right arrows move the point, and the value is announced through an `aria-live="polite"` region.
- Only the overlay is client-side. The line, axis and caption stay server-rendered.

### D6. W-FRI weekly aggregation in `src/lib/weekly.ts`
`toWeekly(bars)`: for each bar, take the `YYYY-MM-DD` string, build `Date.UTC(y, m-1, d)`, and add `(5 − dow + 7) % 7` days to get the week-ending Friday. Bars are grouped by that key in date order: open = first open, high = max, low = min, close = last close, volume = sum.
- UTC is used only for the calendar arithmetic, so the server's timezone never matters.
- The function is pure and has fixtures, including a holiday Friday and a year boundary.
- This is the stated exception in the `pnl-dashboard` delta.
- *Alternative:* a `v_weekly_bars` view. Rejected to keep the no-new-DB-object rule. It can replace the helper later with no spec change.

### D7. Candlestick chart: server SVG plus a client crosshair
- `CandleChart` (server) renders the SVG in a fixed `viewBox`: a y-scale over min(low, levels) to max(high, levels) with 5% padding, wicks, bodies (gain or loss token), dashed level lines with right-edge HTML labels, and markers (▲ fill, ◆ trim, ▼ stop/exit).
- `CandleCrosshair` (client) overlays it, with the same pointer, touch and keyboard pattern as D5, showing week-ending date and OHLC.
- With fewer than 4 candles, it renders the "Not enough price history yet" state plus a level list.
- Marker source:
  - `events` rows of type fill, trim, stop_hit or exit, placed in the week containing `event_date`
  - otherwise `positions.fill_date/fill_price` and `exit_date/exit_price`

### D8. Review bucketing is classification against constants
`src/lib/review.ts` exports the tag sets and thresholds:
- `RIGHT_TAGS = {good_call, winner}`, `R_RIGHT = 1`
- `WRONG_TAGS = {valid_stop, whipsaw_tight_stop, gap_through_stop, bad_entry, rule_violation, loser}`
- `MISSED = {missed_runner}`, `AVOIDED = {avoided_loser}`, `OTHER = {removed_fresh_start, data_gap, other}`
- `MISSED_UP_PCT = 15` (matches the `>= 1.15` used for the `missed_runner` auto tag in `v_trade_review`), `AVOIDED_RET_PCT = -8` (the strategy's 8% stop)

The review set merges `v_trade_review` (positions) with `trade_reviews` rows whose `signal_id` has no position. The effective tag is `review_tag ?? auto_tag`.
- Excluded (pilot) signals stay in "Went wrong" with a marker, because their lessons are real, but they are left out of the outcomes-based missed/avoided list (spec).
- Like near-stop, this compares stored values to constants and computes no figures.

### D9. Heatmap and verdict colours
- **Heatmap:** the cell background is `color-mix(in oklab, var(--gain|--loss) N%, var(--surface))`. N scales with |avg_r| capped at 2R, in 4 steps. Cells with n < 3 use `--chip` and muted text. Every cell prints "x.xx R · n".
- **Verdict mix:** a fixed map from verdict to token, adding `--v-entry`, `--v-reduced`, `--v-alert`, `--v-wait`, `--v-hold` and `--v-nogo` to both palettes. The bar is a flex row of segments with `flex-grow = count`.
- **Status chips:** pass uses `--gain`, weak uses `--warn-fg`/`--warn-bg`, fail uses `--loss`, and pending/n/a use `--chip`. Each chip has a glyph and an `aria-label`.
- Contrast is checked with `.claude/skills/frontend-design/scripts/contrast-checker.py` in both palettes.

### D10. Nav and route files
- `layout.tsx` gets a `SiteNav`. `aria-current` needs the pathname, so `SiteNav` is a tiny client component using `usePathname`. The alternative of passing a prop from each page duplicates code, and the client component is about 20 lines.
- New routes:
  - `src/app/trade/[signal_id]/page.tsx` and `not-found.tsx`
  - `src/app/review/page.tsx`
  - `src/app/runs/page.tsx`
- Each page calls `await connection()` first. The existing root `error.tsx` covers every route.
- `generateMetadata` on the trade page gives the title "SYMBOL · Paper P&L".

### D11. Removing `monthly-suggestions`
Delete:
- `openspec/changes/monthly-suggestions/` (never archived, and its spec was never merged)
- the month and superseded reads and `splitMonthSignals` in `queries.ts`
- `Suggestion`/`WatchAlert`/`PositionStatus` types if unused, `dates.ts`, `closeVsPivotPct`, `na`/`plain`/`plainPct` if unused, and `Suggestions.tsx` (rewritten as `Ideas.tsx`)

`WhyGrade` and `count` are kept and reused.

## Risks / Trade-offs

- [Chart is empty until `price_bars` is backfilled] → Ship the "not enough history" state now; it switches to a chart automatically once 4 or more weeks exist. Ask the price agent to backfill 52 weeks.
- [PostgREST row cap of 1000] → One symbol for 52 weeks is about 250 rows, well under the cap. Order by `bar_date` and bound the date range.
- [Popover API missing on old Safari (< 17)] → The badge text still shows. Only the explanation is lost, and `title` is kept as a fallback.
- [Rendering table and cards doubles DOM] → Row counts are in the tens, so the cost is negligible.
- [Review buckets look damning with pilot data and 0 closed trades] → The small-sample banner, "unresolved" and "pilot" markers, and empty states keep the context visible.
- [`v_run_log.review_stats.closed` (4) disagrees with the ledger (0)] → `/review` uses only `v_trade_stats` for counts. `review_stats` is not shown.
- [Tag list grows in the DB] → An unknown tag falls into "Other notes", so nothing is silently dropped.
- [Client islands add JS] → Two small leaf components with plain props, and no charting library.

## Migration Plan

1. Archive `paper-pnl-v1` so `pnl-dashboard` exists in `openspec/specs` before this change's `MODIFIED` delta is applied at archive.
2. Implement on a branch. Run `npm run lint` and `npm run build`, and check against the live DB at 360, 640 and 1024 px in both colour schemes.
3. Push; Render redeploys. Rollback is reverting the commit, and there is no DB step.

## Open Questions

- The exact copy for empty states and headings can be tuned during implementation without changing the specs.

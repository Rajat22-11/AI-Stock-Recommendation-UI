## 1. Prep

- [x] 1.1 Archive `paper-pnl-v1` so `pnl-dashboard` exists in `openspec/specs` (design: Migration Plan)
- [x] 1.2 Ask the price agent to backfill `price_bars` to 52 weeks for every signalled symbol. This is outside the repo, so record the request and don't block on it (recorded in `notes/price-bars-backfill.md`; the backfill itself is still open)
- [x] 1.3 Read the Next 16 guides for dynamic routes, `searchParams`, `notFound`, `generateMetadata` and client components in `node_modules/next/dist/docs/01-app`, and note any deprecations
- [x] 1.4 Withdraw `monthly-suggestions` (design D11):
  - [x] 1.4.1 Delete `openspec/changes/monthly-suggestions/`
  - [x] 1.4.2 Remove the month and superseded reads and `splitMonthSignals` from `queries.ts`
  - [x] 1.4.3 Remove the types and helpers that become unused, and `dates.ts`
  - [x] 1.4.4 Confirm that lint and build pass

## 2. Shared building blocks

- [x] 2.1 Add the new colour tokens to both palettes in `globals.css`: verdict colours and weak/amber chip. Check contrast with the frontend-design contrast checker (design D9)
- [x] 2.2 Build `DataList`, which renders a table at sm and up and cards below, with primary columns and optional row link and highlight (D2)
- [x] 2.3 Build `InfoTip` (popover with a `title` fallback), and rebuild `RetroBadge` on it (D3)
- [x] 2.4 Build `StatusChip` (pass/weak/fail/pending/n/a with glyph and aria-label), `CountChips` (passes/weak/fails) and `TagChip`
- [x] 2.5 Build `SiteNav` (client, `usePathname`, `aria-current`) and add it to `layout.tsx` (D10)
- [x] 2.6 Add row types for `v_book_risk`, `v_suggestions`, `v_signal_plan`, `v_signal_checklist`, `v_trade_review`, `trade_reviews`, `signal_rationale`, `events`, `price_bars`, `v_signal_outcomes`, `v_rule_effectiveness`, `v_trade_stats` and `v_run_log` to `types.ts`
- [x] 2.7 Add the formatters still needed: R:R "1 : x", R multiple "x.xx R", confidence "n / 5" or "n/a", and the IST timestamp (reuse `istTime`)

## 3. Home

- [x] 3.1 Extend `getDashboard()` with `v_book_risk` and `v_suggestions` in the same `Promise.all` (D1)
- [x] 3.2 Build the `BookRisk` strip with all seven values, the "not available" state, and a wrapped grid on phones (spec: book-risk)
- [x] 3.3 Move the open, closed and pending lists to `DataList`. Primary columns are symbol + P&L % + stop (open), symbol + P&L (closed), and symbol + entry zone + stop (pending). Keep the near-stop highlight, and link rows to `/trade/[signal_id]`
- [x] 3.4 Add y-axis ticks to `EquityCurve` (server) (D5)
- [x] 3.5 Build the `EquityTooltip` client overlay with pointer, touch and arrow-key support and an `aria-live` readout (D5)
- [x] 3.6 Build `Ideas.tsx`:
  - [x] 3.6.1 Entry/Watch tabs from `searchParams` (`?ideas=watch`), with counts
  - [x] 3.6.2 Card fields, CountChips and failed rules
  - [x] 3.6.3 Not-fundable `InfoTip` showing position value vs book cash
  - [x] 3.6.4 "Why" `<details>` with the empty-rationale text
  - [x] 3.6.5 Link to the trade page, empty states and disclaimer (spec: agent-suggestions)
- [x] 3.7 Order the home sections as summary, book risk, current ideas, equity curve, open, closed, pending, footer

## 4. Trade detail page

- [x] 4.1 Add `getTrade(signalId)`: validate a positive integer, run the parallel reads, return `null` when there is no plan row, then fetch `price_bars` for the symbol and date range (D1)
- [x] 4.2 Build `src/app/trade/[signal_id]/page.tsx` (`PageProps`, `await params`, `connection()`, `notFound()`), plus `not-found.tsx` and `generateMetadata`
- [x] 4.3 Build the header (verdict, grade, setup, stage, skill version, retro), the run link `/runs#run-{id}` and the exclusion notice
- [x] 4.4 Build the plan card and the reasoning card, including their null and empty states
- [x] 4.5 Build the checklist table on `DataList` with `StatusChip`, plus its empty state
- [x] 4.6 Build the outcome card for three cases: position with review, review without position, and nothing yet. Include the auto vs review tags, the skill-stop line, MFE/MAE and post-exit run
- [x] 4.7 Build `src/lib/weekly.ts` `toWeekly()` (D6), with fixture checks for a normal week, a holiday Friday, a Saturday bar, and a Dec→Jan week
- [x] 4.8 Build the `CandleChart` server SVG: candles, labelled level lines, markers from events with the position fallback, and the "not enough history" state with a level list (D7)
- [x] 4.9 Build the `CandleCrosshair` client overlay (pointer, touch, keyboard, OHLC readout)
- [x] 4.10 Build the events timeline, plus its empty state

## 5. Review page

- [x] 5.1 Add `getReview()` (D1) and `src/lib/review.ts` with the tag sets, thresholds and an effective-tag merge of `v_trade_review` and `trade_reviews` (D8)
- [x] 5.2 Build `src/app/review/page.tsx` with the small-sample banner, driven by the `overall` closed count
- [x] 5.3 Build the "Went right" and "Went wrong" lists (unresolved and pilot markers, lessons, links) and the collapsed "Other notes" list
- [x] 5.4 Build "Missed / avoided" from tags and from `v_signal_outcomes`, excluding positioned, excluded, provisional and HOLD signals, with its empty state
- [x] 5.5 Build the rule-effectiveness heatmap: ord rows × status columns, diverging fill, muted cells under 3 trades, legend, empty state (D9)
- [x] 5.6 Build the stats tables for why_grade, setup, skill_version and verdict, plus the overall summary line ("unspecified" for null groups)

## 6. Runs page

- [x] 6.1 Add `getRuns()` with `v_run_log` and `v_signal_plan` grouped by `run_id` (D1)
- [x] 6.2 Build `src/app/runs/page.tsx` with run cards and `id="run-{id}"` anchors: type, as-of date, IST start time, status marker, skill version, model and summary
- [x] 6.3 Build the verdict-mix bar and chips in fixed order with fixed colours, plus the "No verdicts" state
- [x] 6.4 Build the observations, lessons and proposed change (with `proposal_status`) blocks as collapsible `<details>`
- [x] 6.5 Build the signal chips grouped by verdict, linking to trade pages, with "Show all N" above 12

## 7. Verify

- [x] 7.1 `npm run lint` and `npm run build` pass
- [x] 7.2 Home against live data:
  - [x] 7.2.1 The book risk strip matches `v_book_risk` (2 / 10, ₹13,237 · 1.33%)
  - [x] 7.2.2 The tabs read "Entry 2" and "Watch 20"
  - [x] 7.2.3 SUNFLAG shows ✓5 ~2 ✗2 and its two failed rules
  - [x] 7.2.4 `?ideas=watch` opens Watch
  - [x] 7.2.5 The equity tooltip shows stored values
- [x] 7.3 Trade pages:
  - [x] 7.3.1 `/trade/28` renders, with the BOSCH_HCIL checklist of 9 rows
  - [x] 7.3.2 `/trade/4` shows "Auto: open" and "Review: rule_violation" and the skill stop as intact
  - [x] 7.3.3 `/trade/7` shows its review and "No paper position", plus the exclusion notice
  - [x] 7.3.4 `/trade/999999` and `/trade/abc` return 404
  - [x] 7.3.5 The chart shows "Not enough price history" with today's 4 bars
- [x] 7.4 `/review`:
  - [x] 7.4.1 The banner shows 0 closed trades
  - [x] 7.4.2 JSWINFRA, ROLEXRINGS, ABDL and STEELCAS appear under "Went wrong" marked pilot
  - [x] 7.4.3 SUNFLAG and SOMANYCERA are marked unresolved
  - [x] 7.4.4 MUKANDLTD and SHANTIGOLD appear only in "Other notes"
  - [x] 7.4.5 The heatmap and missed/avoided lists show their empty states
- [x] 7.5 `/runs`:
  - [x] 7.5.1 Runs are listed 4 → 1
  - [x] 7.5.2 Run 1 shows "partial"
  - [x] 7.5.3 Run 3's chips are in order with "Show all 29"
  - [x] 7.5.4 The trade page's run link scrolls to the right card
- [x] 7.6 Layout at 360, 640 and 1024 px in light and dark: no horizontal page scroll, P&L and stop visible on phone cards, and popovers usable by tap and keyboard
- [x] 7.7 With Supabase unreachable, every route shows "Tracker database is unreachable"
- [x] 7.8 `list_migrations` is unchanged and no write calls exist (grep for `.insert(`, `.update(`, `.upsert(`, `.delete(`, `.rpc(`)
- [x] 7.9 `openspec validate agent-analysis --strict` passes

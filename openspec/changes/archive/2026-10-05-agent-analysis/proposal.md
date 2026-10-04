## Why

The scheduled agents now store their full reasoning in the database: a plan, a rule checklist and a written rationale for each idea, a review of each trade, and lessons for each run. The site only shows ledger P&L, so none of that can be read or judged. This change makes the agent's thinking and its track record visible. The site stays read-only, uses the anon key, has no auth and adds no DB objects. It also fixes three dashboard problems: tables that hide P&L and stop columns on phones, a RETRO badge whose explanation only appears on mouse hover, and an equity curve with no y values.

## What Changes

- **Home: book risk strip.** A new row under the summary tiles, read from `v_book_risk`: equity, cash and cash %, open risk ₹ and %, pending committed ₹, cash after pending, open vs max positions, and the as-of date.
- **Home: RETRO badge.** It becomes a tap- and keyboard-accessible tooltip instead of a hover-only `title`.
- **Home: mobile tables.** Below 640px, the open, closed and pending tables (and every new list) render as cards. P&L and stop are always visible, with no sideways scroll needed to see them.
- **Home: equity curve.** It gains labelled y-axis values and a pointer/touch/keyboard tooltip showing date, equity and return.
- **Home: Current ideas section.** Replaces the unbuilt "Suggestions this month" design. Ideas come from `v_suggestions`: the latest non-superseded, non-excluded idea per symbol over the last 31 days to `processed_through`.
  - Two tabs, Entry and Watch.
  - Each card shows verdict, entry zone, stop, trim, R:R, rupee risk, confidence, checklist counts with failed rules, and a "Not fundable in paper book" badge when `fundable_now` is false.
  - A "Why" expander shows thesis, catalyst, risks, invalidation, alternatives considered and data gaps.
  - Each card links to its trade page.
- **New page `/trade/[signal_id]`.** Works for any signal, whether or not it ever became a position. It shows:
  - a plan card (`v_signal_plan`)
  - a reasoning card (`signal_rationale`, `why_text`)
  - a checklist table (`v_signal_checklist`)
  - an outcome card (`v_trade_review` and `trade_reviews`: auto tag vs review tag, R multiple, MFE/MAE, the skill-stop counterfactual, post-exit run)
  - a weekly (W-FRI) candlestick chart built from `price_bars`, with pivot, entry, stop and trim lines and fill/exit markers
  - an events timeline (`events`)
  - an exclusion notice when the signal is excluded
- **New page `/review`.**
  - "Went right", "Went wrong" and "Missed / avoided" lists, built from review tags, R multiples and `v_signal_outcomes`.
  - A rule-effectiveness heatmap (`v_rule_effectiveness`).
  - Stats by why-grade, setup, skill version and verdict (`v_trade_stats`).
  - A "fewer than 30 closed trades — not statistically meaningful" banner while closed trades are below 30.
- **New page `/runs`.** Every run from `v_run_log`, newest first, with verdict mix, summary, observations, lessons and proposed change. Each run links to its signals.
- **Site navigation.** A header nav (Home · Review · Runs) on every page.
- **BREAKING (spec):** the dashboard is no longer "one page at `/`". It becomes a small read-only site of four routes.
- **Weekly bars exception.** Weekly candles are aggregated from daily `price_bars` in the UI. This is the one stated exception to "figures come from the database". No new view is added.
- **Superseded change.** The unimplemented-in-main `monthly-suggestions` change (calendar-month list from `signals`) is withdrawn and its working-tree code removed. `v_suggestions` replaces it.
- **No database change.** No new table, view, column, function, RLS policy or grant.

## Capabilities

### New Capabilities
- `book-risk`: the book risk strip on the dashboard, from `v_book_risk`.
- `agent-suggestions`: the Current ideas section, covering Entry/Watch tabs, the card contents, checklist chips, the fundability badge and the Why expander.
- `trade-detail`: the `/trade/[signal_id]` page, covering the plan, reasoning, checklist, outcome, weekly chart and events timeline, and its not-found behaviour.
- `trade-review`: the `/review` page, covering the outcome buckets, rule heatmap, dimension stats and the small-sample banner.
- `run-log`: the `/runs` page and its links from runs to signals.

### Modified Capabilities
- `pnl-dashboard`:
  - multiple pages instead of a single page
  - responsive card layout for the position tables
  - an accessible tooltip for the retro marker
  - a y-axis and tooltip on the equity curve
  - the weekly-bar aggregation exception to the figures rule
  - a shared header nav

  This capability is still a delta in `paper-pnl-v1`, so that change must be archived before this one.

## Impact

- **Code:**
  - `src/app/page.tsx`
  - new `src/app/trade/[signal_id]/`, `src/app/review/`, `src/app/runs/`
  - `src/app/layout.tsx` (nav)
  - `src/components/` (responsive list, chips, popover badge, book risk, suggestions, candlestick chart, equity curve)
  - `src/lib/queries.ts` (one reader per page)
  - `src/lib/types.ts`, `src/lib/format.ts`
  - a new weekly-aggregation helper
- **Removed:** the working-tree `monthly-suggestions` code paths (`signals` month read, superseded read, `dates.ts` if unused) and the `openspec/changes/monthly-suggestions/` folder.
- **Client JavaScript:** two small client components, the equity-curve tooltip and the candlestick crosshair. Everything else stays server-rendered.
- **Supabase:** read-only selects with the existing publishable key. Schema, RLS and grants are unchanged.
- **Data prerequisite (outside this repo):** the price agent backfills `price_bars` to 52 weeks for every signalled symbol. Until then, the chart shows a "not enough price history" state.
- **Hosting:** Render free tier, unchanged. Every page renders per request via `connection()`.

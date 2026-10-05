# trade-detail Specification

## Purpose
A read-only page per signal at `/trade/[signal_id]` that puts the agent's plan, reasoning and rule checklist next to what actually happened: the review, a weekly price chart with the planned levels, and the ledger events. It covers signals that never became positions as well as filled trades.
## Requirements
### Requirement: Route and not-found
`/trade/[signal_id]` SHALL render for any `signal_id` that has a row in `v_signal_plan`, including signals with no position, excluded signals, and signals whose position was removed. When `signal_id` is not a positive integer or has no `v_signal_plan` row, the route SHALL respond with HTTP 404 and a "Signal not found" page linking back to `/`.

#### Scenario: Pending trade
- **WHEN** `/trade/28` is requested and signal 28 (BOSCH_HCIL) has a pending position
- **THEN** the page renders with HTTP 200

#### Scenario: Signal without a position
- **WHEN** `/trade/7` is requested and signal 7 (ROLEXRINGS) has a trade review but no position row
- **THEN** the page renders the plan, checklist and review, and says "No paper position for this signal"

#### Scenario: Unknown id
- **WHEN** `/trade/999999` or `/trade/abc` is requested
- **THEN** the response is HTTP 404 with "Signal not found"

### Requirement: Header and exclusion notice
The page SHALL show the symbol, verdict, signal date, setup, stage, why-grade, skill version and a retro badge when retro-seeded, plus a link to the run that produced the signal (`/runs#run-{run_id}`). When the signal has a `signal_exclusions` row, the page SHALL show a notice "Excluded from analysis" with its batch and reason.

#### Scenario: Excluded signal
- **WHEN** the signal has an exclusion row with a reason
- **THEN** the header shows "Excluded from analysis" and the reason

### Requirement: Plan card
The page SHALL show a plan card from `v_signal_plan`:
- entry zone (`entry_ref` to `entry_high`)
- stop (`stop_ref`) with planned risk % (`risk_pct_plan`)
- trim (`trim_ref`) with planned reward % (`reward_pct_plan`)
- R:R (`rr_plan`)
- size % (`size_pct`) and position value (`position_value`)
- rupee risk (`rupee_risk`) and rupee reward at trim (`rupee_reward_at_trim`)
- capital risk % (`capital_risk_pct`)
- book status with `book_reason`

#### Scenario: SUNFLAG plan
- **WHEN** signal 29 has entry_ref 433.5, stop_ref 398.82, trim_ref 541.88, rr_plan 3.13 and rupee_risk 4000
- **THEN** the plan card shows those values formatted, with "1 : 3.13" and "₹4,000"

### Requirement: Reasoning card
The page SHALL show a reasoning card with the why-grade and `why_text` from the signal and, from `signal_rationale`, thesis, catalyst, risks, invalidation, alternatives considered, data gaps and confidence (out of 5). Null fields SHALL be omitted. If there is no rationale row, the card SHALL say "No written rationale for this signal".

#### Scenario: No rationale
- **WHEN** the signal has no `signal_rationale` row
- **THEN** the card shows the why-grade and why_text and "No written rationale for this signal"

### Requirement: Checklist table
The page SHALL list the `v_signal_checklist` rows for the signal in `ord` order with rule, measured, target and status. Status SHALL be a chip:
- pass → green ✓
- weak → amber ~
- fail → red ✗
- pending or n/a → grey –

Each chip SHALL carry its status as text for assistive technology. Below 640px the table SHALL render as cards.

#### Scenario: BOSCH_HCIL checklist
- **WHEN** signal 28's checklist has 9 rows
- **THEN** the table shows 9 rows in `ord` order, with "Distance above 13w SMA" measured "20.9%" marked weak and "Weekly close above pivot" marked pass

#### Scenario: No checklist rows
- **WHEN** the signal has no checklist rows
- **THEN** the section shows "No checklist recorded"

### Requirement: Outcome card
When the signal has a `v_trade_review` row, the page SHALL show an outcome card with:
- status, fill date and price, exit date, price and reason
- realised P&L, R multiple and days held
- MFE % and MAE %
- the automatic tag (`auto_tag`) and the review tag (`review_tag`) side by side, labelled "Auto" and "Review", with the review lesson and its author
- a skill-stop line comparing the ledger stop (`stop_at_fill`) with the skill stop (`skill_stop`), stating whether the skill stop is still intact (`skill_stop_still_intact`)
- post-exit run % (`post_exit_run_pct`) when the position is closed

When there is no `v_trade_review` row but a `trade_reviews` row exists, the card SHALL show that review's tag, lesson and author with "No paper position for this signal".

#### Scenario: Open trade with skill stop intact
- **WHEN** signal 4 (SOMANYCERA) is open with skill_stop 568.61, skill_stop_still_intact true, auto_tag open and review_tag rule_violation
- **THEN** the card shows "Auto: open", "Review: rule_violation", the review lesson, and "Skill stop 568.61 — still intact"

#### Scenario: Removed trade
- **WHEN** signal 6 (STEELCAS) has a trade_reviews row tagged valid_stop and no position
- **THEN** the card shows "Review: valid_stop", its lesson, and "No paper position for this signal"

#### Scenario: Nothing to review
- **WHEN** the signal has neither a review nor a position
- **THEN** the outcome card shows "No outcome yet"

### Requirement: Weekly candlestick chart
The page SHALL draw weekly candles for the signal's symbol from `price_bars`. Daily bars are grouped into weeks ending Friday (W-FRI): each daily bar belongs to the week that ends on the first Friday on or after its date. Each candle SHALL use:
- open: the first bar's open
- high: the highest high
- low: the lowest low
- close: the last bar's close

These are the only computed prices on the site. The chart SHALL cover up to 52 weeks ending at the latest bar.

The chart SHALL overlay these horizontal lines, each labelled with its value, omitting any that is null:
- pivot
- entry (`entry_ref`)
- stop (`stop_ref`)
- trim (`trim_ref`)
- current stop (`stop_current`) when it differs from the planned stop

It SHALL mark the fill and any trim, stop-hit or exit, from `events` when present and otherwise from the position's fill and exit date and price.

A pointer, touch or keyboard crosshair SHALL show the week-ending date and OHLC of the selected candle.

#### Scenario: Week grouping
- **WHEN** daily bars exist for Mon 28 Sep to Thu 1 Oct 2026 and Fri 2 Oct 2026 is a holiday
- **THEN** they form one candle for the week ending 2 Oct 2026, with close equal to the 1 Oct close

#### Scenario: Fill marker from position
- **WHEN** the position has fill_date 2026-09-28 and fill_price 618.05 and no matching fill event
- **THEN** a fill marker is drawn at 618.05 on the week ending 2 Oct 2026

#### Scenario: Not enough history
- **WHEN** fewer than 4 weekly candles are available
- **THEN** the chart area shows "Not enough price history yet (N weeks)" and the planned levels as a list, instead of a chart

### Requirement: Events timeline
The page SHALL list the signal's `events` rows by `event_date` then `id`, each with date, event type, price, quantity, P&L when present, and the rule text. If there are none, it SHALL show "No ledger events".

#### Scenario: Fill event
- **WHEN** signal 4 has a fill event on 2026-09-28 at 618.05 for 161 shares
- **THEN** the timeline shows "28 Sep 2026 · fill · 618.05 × 161" with the rule text

### Requirement: Fresh, read-only, graceful
The page SHALL read current data on every request and SHALL NOT write. If any read fails, it SHALL show "Tracker database is unreachable".

#### Scenario: Read failure
- **WHEN** the Supabase request for the checklist fails
- **THEN** the page shows "Tracker database is unreachable"


# paper-ledger Specification

## Purpose
Defines the paper-trading ledger's observable outputs that the dashboard depends on: the capital base, how entries too small to buy one share are handled, the daily equity series, and the labelled trade-stats breakdown.
## Requirements
### Requirement: Paper capital is read from config
The paper capital SHALL be the value of `config.paper_capital` (₹10,00,000 at the time of this change; it is not changed by this change). Every capital figure the ledger views expose SHALL come from that key, so changing it and replaying the ledger changes all derived figures with no other edit.

#### Scenario: Capital exposed by the equity view
- **WHEN** reading `v_equity_daily`
- **THEN** `capital` on every row equals `config.paper_capital`

### Requirement: Entries smaller than one share are skipped, not errored
When the planned position size for a pending entry is less than the fill price of one share, the ledger SHALL mark the position `skipped` with `exit_reason = 'size_below_1_share'` and record a `skip` event with that reason. The replay SHALL complete without error. A position the planned size can afford but available cash cannot SHALL keep the reason `insufficient cash`.

#### Scenario: High-priced stock above the planned size
- **WHEN** a pending ENTRY fills at ₹17,600 and its planned size is ₹15,000
- **THEN** the position status is `skipped` with `exit_reason = 'size_below_1_share'`
- **AND** an event of type `skip` exists for that position whose rule names the size shortfall
- **AND** the ledger replay returns normally and processes the remaining positions

#### Scenario: Affordable size but no cash
- **WHEN** the planned size covers at least one share but available paper cash does not
- **THEN** the position is `skipped` with `exit_reason = 'insufficient cash'`

### Requirement: Equity series has a starting row and continues after closes
`v_equity_daily` SHALL return:
- one cash-only row dated the calendar day before the earliest fill, with `equity = cash = capital`, zero invested and zero P&L
- one row for every trading session (a date present in `price_bars`) from the earliest fill through `processed_through`, whether or not any position is open that day.

On days with no open positions, cash and equity SHALL equal capital plus cumulative realized P&L, and invested, market value and unrealized SHALL be zero. If there has been no fill at all, the view SHALL return a single cash-only row dated `processed_through`.

#### Scenario: Baseline before the first fill
- **WHEN** the earliest fill is on 2026-09-28
- **THEN** the first row of `v_equity_daily` has `as_of = 2026-09-27`, `equity` and `cash` equal to `config.paper_capital`, `invested = 0`, `day_pnl = 0` and `return_pct = 0`

#### Scenario: All positions closed
- **WHEN** every position is closed and more sessions follow, up to `processed_through`
- **THEN** each later session has a row with `open_positions = 0`, `unrealized = 0`, and the same `equity` as the previous row

#### Scenario: No fills yet
- **WHEN** no position has ever filled
- **THEN** `v_equity_daily` returns exactly one row, dated `processed_through`, with `equity = capital`

### Requirement: Trade stats carry a readable dimension label
Each `v_trade_stats` row SHALL include a `dimension` text column naming its grouping: `overall`, `verdict`, `why_grade`, `setup`, `skill_version` or `verdict_why_grade`. Existing columns SHALL keep their names and meaning.

#### Scenario: Overall row
- **WHEN** reading `v_trade_stats` where `dimension = 'overall'`
- **THEN** exactly one row is returned, with verdict, why_grade, setup and skill_version all null


## Purpose

Shows on the dashboard what the breakout-with-volume skill suggested this calendar month, why it suggested it, and what the paper ledger did with each suggestion. It is read-only and independent of paper cash.

## ADDED Requirements

### Requirement: Suggestions section placement
The dashboard SHALL show a section titled "Suggestions this month" directly below the summary tiles and above the equity curve. The section SHALL be read-only: it has no forms, buttons that change data, or writes of any kind.

#### Scenario: Section order
- **WHEN** the page renders
- **THEN** the "Suggestions this month" section appears after the summary tiles and before "Equity curve"

### Requirement: Which signals are listed
The section SHALL list every `signals` row where:
- `verdict` is `ENTRY` or `ENTRY_REDUCED`
- `provisional` is false
- no other signal's `supersedes` points to it
- `signal_date` falls in the current calendar month, judged by today's date in Asia/Kolkata.

Rows SHALL be ordered by `signal_date` newest first, then by signal id newest first. Whether a signal is listed SHALL NOT depend on paper cash, on whether a position exists for it, or on that position's status.

#### Scenario: Current-month entry listed
- **WHEN** today in Asia/Kolkata is 2026-10-02 and a signal has verdict ENTRY_REDUCED, provisional false, signal_date 2026-10-01 and is not superseded
- **THEN** it is listed

#### Scenario: Previous month excluded
- **WHEN** today in Asia/Kolkata is 2026-10-02 and a signal has signal_date 2026-09-25
- **THEN** it is not listed

#### Scenario: Month boundary uses IST
- **WHEN** the server clock reads 2026-10-31 19:00 UTC (2026-11-01 00:30 IST)
- **THEN** the current month is November 2026

#### Scenario: Provisional excluded
- **WHEN** a current-month ENTRY signal has provisional true
- **THEN** it is not listed

#### Scenario: Superseded excluded
- **WHEN** signal 40 has `supersedes = 31`
- **THEN** signal 31 is not listed, and signal 40 is listed if it meets the other conditions

#### Scenario: Other verdicts excluded
- **WHEN** a current-month signal has verdict WAIT, WAIT_ALERT, NO_GO, HOLD, TRIM, ADD, REDUCE or EXIT
- **THEN** it is not in the suggestions table

#### Scenario: Skipped for cash still listed
- **WHEN** a qualifying signal's position was skipped with reason "insufficient cash"
- **THEN** the signal is still listed

#### Scenario: Nothing this month
- **WHEN** no signal qualifies
- **THEN** the section shows "No suggestions this month" instead of an empty table

### Requirement: Suggestion columns
Each listed row SHALL show:
- symbol
- signal date
- verdict, with ENTRY_REDUCED marked as half size
- entry zone (`entry_low` to `entry_high`)
- stop
- trim
- size % (`size_pct`)
- entry window (`window_start` to `window_end`)
- paper status.

Stop and trim SHALL be read from the database, never computed by the page. If the signal's position has filled, they SHALL show the position's `stop_at_fill` and `trim_price` (the 8%-below-fill stop and +25% trim set by the ledger). Otherwise they SHALL show the signal's planned `stop` and `trim_price`, marked as planned. The column headers SHALL say the rule ("8% below fill", "+25%").

#### Scenario: Reduced verdict
- **WHEN** a listed signal has verdict ENTRY_REDUCED and size_pct 5
- **THEN** the row shows ENTRY_REDUCED with a "half size" marker and size "5%"

#### Scenario: Unfilled signal shows planned stop
- **WHEN** a listed signal has stop 398.82, trim_price 541.88 and its position is pending
- **THEN** the row shows stop "398.82" and trim "541.88", each marked as planned

#### Scenario: Filled signal shows ledger stop
- **WHEN** a listed signal's position is open with stop_at_fill 290.40 and trim_price 394.56
- **THEN** the row shows stop "290.40" and trim "394.56" with no planned marker

#### Scenario: Window display
- **WHEN** a signal has window 2026-10-05 to 2026-10-08
- **THEN** the row shows "5 Oct 2026 – 8 Oct 2026"

### Requirement: Paper status from the ledger
Paper status SHALL come from the `positions` row whose `signal_id` equals the signal's id:
- `pending`, `open`, `closed` or `expired` SHALL be shown as that status
- `skipped` SHALL be shown together with the position's `exit_reason`, e.g. "skipped · insufficient cash"
- a signal with no position row SHALL show "not in ledger yet".

#### Scenario: Skipped with reason
- **WHEN** the position for a listed signal has status skipped and exit_reason "size_below_1_share"
- **THEN** the status reads "skipped · size_below_1_share"

#### Scenario: No position yet
- **WHEN** a listed signal has no positions row
- **THEN** the status reads "not in ledger yet"

### Requirement: Why expander with checklist
Each listed row SHALL have a "Why" expander, collapsed by default. Expanded, it SHALL show:
1. the why-grade badge (`why_grade` A–D) and `why_text`
2. a checklist of the stored setup values:
   - close vs pivot: `signal_close`, `pivot`, and the percentage of close above or below pivot
   - volume: `vol_mult` against the 2× threshold
   - `correction_pct`
   - `dist_sma_pct`, together with whether `sma13_rising` is true
   - `base_range_pct`
   - `close_loc`
   - `liquidity_tier`.

Any missing value (null) SHALL be shown as "n/a" and SHALL NOT be shown as zero or treated as a pass or fail. Pass or fail marks SHALL appear only where a threshold is stated: close above pivot, `vol_mult` at or above 2, and `sma13_rising` true.

The close-vs-pivot percentage is the one figure on the page that the page derives itself, from two stored values, for explanation only. This is a stated exception to the dashboard rule that every percentage comes from the database. It SHALL NOT be used for any trading figure.

#### Scenario: Collapsed by default
- **WHEN** the page loads
- **THEN** every Why expander is closed and the row's columns are visible without opening it

#### Scenario: Full checklist
- **WHEN** a signal has signal_close 1967.2, pivot 1891.3, vol_mult 3.1, sma13_rising true, dist_sma_pct 20.9
- **THEN** the checklist shows close vs pivot "+4.01%" marked pass, volume "3.10× vs 2×" marked pass, and dist from SMA "+20.90%" with "SMA13 rising" marked pass

#### Scenario: Volume below threshold
- **WHEN** a signal has vol_mult 1.08
- **THEN** the volume line shows "1.08× vs 2×" marked fail

#### Scenario: Missing values
- **WHEN** a signal has vol_mult, correction_pct and sma13_rising all null
- **THEN** each of those lines shows "n/a" with no pass or fail mark, and none shows "0"

#### Scenario: No why grade
- **WHEN** a signal has why_grade null and why_text null
- **THEN** the expander shows "n/a" for the grade and the reason, and still shows the checklist

### Requirement: Watchlist alerts block
Below the suggestions table, the section SHALL include a "Watchlist alerts" block, collapsed by default. It SHALL list `WAIT_ALERT` signals with `signal_date` in the current calendar month (Asia/Kolkata), not provisional and not superseded, keeping only the latest signal per symbol (latest `signal_date`, then highest id). Each row SHALL show symbol, signal date, trigger price (`alert_trigger`) and required volume (`req_vol_abs`) with Indian digit grouping. The block's label SHALL show the number of symbols.

#### Scenario: Latest per symbol
- **WHEN** MANKIND has WAIT_ALERT signals dated 2026-10-01 and 2026-10-08 this month
- **THEN** the block shows one MANKIND row, from 2026-10-08

#### Scenario: Collapsed with count
- **WHEN** 19 symbols have WAIT_ALERT signals this month
- **THEN** the block is closed on load and its label reads "Watchlist alerts" with the count 19

#### Scenario: Required volume grouping
- **WHEN** a signal has req_vol_abs 23577470
- **THEN** required volume reads "2,35,77,470"

#### Scenario: No alerts
- **WHEN** no WAIT_ALERT signal qualifies this month
- **THEN** the block shows "No watchlist alerts this month"

### Requirement: Retro-seeded badge
Rows in the suggestions table and in the watchlist alerts block whose signal has `retro_seeded = true` SHALL show the same "retro" badge used elsewhere on the page.

#### Scenario: Retro-seeded suggestion
- **WHEN** a listed suggestion has retro_seeded true
- **THEN** its row shows a "retro" badge

### Requirement: Disclaimer footer
The section SHALL end with the text "Paper-trading signals, not investment advice."

#### Scenario: Footer present
- **WHEN** the section renders, with or without rows
- **THEN** it ends with "Paper-trading signals, not investment advice."

### Requirement: Identity, freshness and failure
Rows SHALL be keyed by signal id. The section's data SHALL be read fresh on every request, like the rest of the page. If any of its database reads fails, the page SHALL show the existing "Tracker database is unreachable" error rather than an empty or partial section.

#### Scenario: Read failure
- **WHEN** the suggestions read returns an error
- **THEN** the page shows "Tracker database is unreachable"

### Requirement: No schema change
This capability SHALL be delivered with no change to the database: no new or altered table, view, column, function, trigger, policy or grant.

#### Scenario: Migrations untouched
- **WHEN** the change is applied
- **THEN** the Supabase migration list is the same as before

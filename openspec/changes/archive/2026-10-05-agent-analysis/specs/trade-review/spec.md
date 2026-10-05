## Purpose

A read-only `/review` page that shows how the agent's calls turned out: what went right, what went wrong, what it missed or avoided, which checklist rules predict results, and how results split by grade, setup, skill version and verdict. It makes clear when the sample is too small to mean anything.

## ADDED Requirements

### Requirement: Effective tag
For a reviewed trade, the effective tag SHALL be the human or agent review tag when present, otherwise the automatic tag. This means `v_trade_review.review_tag`, falling back to `auto_tag`, or the `trade_reviews.tag` for a signal with no position. The page SHALL show both tags wherever both exist.

#### Scenario: Review tag overrides auto tag
- **WHEN** signal 4 has auto_tag open and review_tag rule_violation
- **THEN** its effective tag is rule_violation and both tags are shown

### Requirement: Went right
The "Went right" list SHALL contain every trade whose `v_trade_review.r_multiple` is at least 1, or whose effective tag is `good_call` or `winner`, newest first by exit or signal date. Each entry SHALL show symbol, verdict, R multiple, realised P&L, effective tag, lesson, and a link to its trade page.

#### Scenario: Winner by R
- **WHEN** a closed trade has r_multiple 1.4 and no review tag
- **THEN** it is listed under "Went right"

#### Scenario: Empty
- **WHEN** no trade qualifies
- **THEN** the list shows "Nothing has gone right yet"

### Requirement: Went wrong
The "Went wrong" list SHALL contain every reviewed signal whose effective tag is one of `valid_stop`, `whipsaw_tight_stop`, `gap_through_stop`, `bad_entry`, `rule_violation` or `loser`. It SHALL include reviews from `trade_reviews` whose signal no longer has a position. Each entry SHALL show:
- symbol and effective tag
- the lesson and its author
- the position status: open, pending, closed, or "no position"
- a "pilot" marker when the signal is in `signal_exclusions`
- a link to its trade page

An entry whose position is still open or pending SHALL be marked "unresolved", so it is not read as a realised loss.

#### Scenario: Removed pilot stop-outs listed
- **WHEN** trade_reviews tags JSWINFRA, ROLEXRINGS and ABDL as whipsaw_tight_stop and STEELCAS as valid_stop, all with no position and all excluded
- **THEN** all four appear under "Went wrong", each with its lesson, "no position" and a "pilot" marker

#### Scenario: Unresolved rule violation
- **WHEN** SUNFLAG (pending) is tagged rule_violation
- **THEN** it appears under "Went wrong" marked "unresolved"

### Requirement: Missed and avoided
The "Missed / avoided" list SHALL contain:
- every signal tagged `missed_runner` or `avoided_loser` (effective tag)
- every `v_signal_outcomes` row for a signal that has no position, is not in `signal_exclusions`, is not provisional and whose verdict is not HOLD, where one of these holds:
  - **missed:** `trigger_hit_date` is not null and `max_up_4w_pct` is at least 15
  - **avoided:** `ret_4w_pct` is at most -8

The 15 and -8 thresholds are fixed UI constants. Each entry SHALL show symbol, verdict, signal date, which case it is, the stored outcome figures, and a link to its trade page.

#### Scenario: Missed runner from outcomes
- **WHEN** a WAIT_ALERT signal with no position has trigger_hit_date 2026-10-08 and max_up_4w_pct 22.5
- **THEN** it is listed as "missed" with "+22.50% max in 4w"

#### Scenario: Avoided loser from outcomes
- **WHEN** a NO_GO signal with no position has ret_4w_pct -11.2
- **THEN** it is listed as "avoided"

#### Scenario: Outcomes not yet known
- **WHEN** no outcome row has the needed figures and no signal carries those tags
- **THEN** the list shows "Not enough price history to judge missed or avoided calls yet"

### Requirement: Other review notes
Reviews whose effective tag is `removed_fresh_start`, `data_gap` or `other` SHALL be listed in a collapsed "Other notes" group, with tag, symbol and lesson, and SHALL NOT appear in the three buckets.

#### Scenario: Fresh-start removal
- **WHEN** MUKANDLTD is tagged removed_fresh_start
- **THEN** it appears only under "Other notes"

### Requirement: Rule effectiveness heatmap
The page SHALL show `v_rule_effectiveness` as a grid:
- rows: rules in `ord` order
- columns: statuses pass, weak, fail, n/a
- each cell: `avg_r` and the trade count, coloured on a diverging scale around 0 R (loss colour below, gain colour above)

A cell with fewer than 3 trades SHALL be shown muted with its count, and SHALL NOT be colour-scaled. Colour SHALL NOT be the only carrier of the value. If the view returns no rows, the section SHALL show "No closed trades to score rules yet".

#### Scenario: Small cell muted
- **WHEN** rule "Breakout volume" / fail has trades 2 and avg_r -1.0
- **THEN** the cell shows "-1.00 R · 2" muted and uncoloured

#### Scenario: Empty view
- **WHEN** `v_rule_effectiveness` returns no rows
- **THEN** the section shows "No closed trades to score rules yet"

### Requirement: Stats by dimension
The page SHALL show `v_trade_stats` rows as one table each for the dimensions `why_grade`, `setup`, `skill_version` and `verdict`. Each table SHALL show the group value, closed, open, not filled, win rate %, average return %, average R, average days held and realised P&L, all as stored. A null group value SHALL read "unspecified". The `overall` row SHALL be shown as a summary line above the tables.

#### Scenario: Why-grade table
- **WHEN** `v_trade_stats` has rows with dimension why_grade
- **THEN** a "By why-grade" table lists one row per grade with its stored figures

### Requirement: Small-sample banner
While the `closed` count of the `v_trade_stats` row with dimension `overall` is below 30, the page SHALL show at the top the banner "Fewer than 30 closed trades — not statistically meaningful", with the current count. If no overall row exists, the count SHALL be treated as 0.

#### Scenario: Banner shown
- **WHEN** the overall closed count is 0
- **THEN** the banner shows with "0 closed trades"

#### Scenario: Banner hidden
- **WHEN** the overall closed count is 30
- **THEN** no banner is shown

### Requirement: Fresh, read-only, graceful
The page SHALL read current data on every request, SHALL NOT write, and SHALL show "Tracker database is unreachable" if any read fails.

#### Scenario: Read failure
- **WHEN** the `v_trade_stats` read fails
- **THEN** the page shows "Tracker database is unreachable"

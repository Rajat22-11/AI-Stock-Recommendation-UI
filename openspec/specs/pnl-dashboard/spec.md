# pnl-dashboard Specification

## Purpose
A single public, read-only web page that shows the paper-trading book's P&L, positions and pending entries exactly as the database computes them, without recomputing any trading figure.
## Requirements
### Requirement: Single public page with no authentication
The dashboard SHALL be a small read-only site of four routes: `/`, `/trade/[signal_id]`, `/review` and `/runs`. Every route SHALL be reachable without login, Basic auth or any other credential. No route SHALL contain a form, a control that changes data, or any write to the database.

#### Scenario: Anonymous visit
- **WHEN** anyone requests `/`, `/review`, `/runs` or `/trade/28` with no credentials
- **THEN** the page renders with HTTP 200

#### Scenario: No write paths
- **WHEN** any route is rendered
- **THEN** it issues only read queries and offers no control that submits data

### Requirement: Figures come from the database, not the UI
Every money amount, percentage, stop, distance, R multiple and P&L figure on the site SHALL be a value read from a database view or table. The site SHALL NOT compute fills, stops, trims, P&L, returns, R multiples or distances itself. Formatting values for display (currency, grouping, dates, signs) is allowed.

Two scoped exceptions are allowed:
- weekly candles aggregated from daily `price_bars` on the trade page (see `trade-detail`)
- y-axis tick values on charts, chosen to span the plotted data range

Comparing a stored value against a fixed UI constant to classify or highlight it (near-stop, review buckets) is not a computed figure.

#### Scenario: Value matches the database
- **WHEN** a figure is shown on any page
- **THEN** it equals the corresponding database column after display formatting only, unless it is a weekly candle value or an axis tick

### Requirement: Summary row
The page SHALL show capital, equity, realised P&L, unrealised P&L and total return %, taken from the latest `v_equity_daily` row, together with the "data through" date from `config.processed_through`. No amount, including capital, SHALL be hardcoded in the UI, so a change to `config.paper_capital` shows up without a code change.

#### Scenario: Latest equity row present
- **WHEN** the latest `v_equity_daily` row has equity 146,500 and return_pct -2.333
- **THEN** the summary shows equity "₹1,46,500" and return "-2.33%"
- **AND** shows the `processed_through` date as the data-through date

### Requirement: Equity curve
The page SHALL draw the equity curve from all `v_equity_daily` rows in date order, with the starting capital visible as the first point.
- The chart SHALL show labelled y-axis values in INR.
- A tooltip SHALL show the date, equity and return % of the nearest point. It SHALL be reachable by mouse hover, touch, and keyboard focus with arrow keys.
- The tooltip values SHALL be the row's stored `equity` and `return_pct`.

#### Scenario: Curve rendering
- **WHEN** `v_equity_daily` has N rows
- **THEN** the curve has N points in `as_of` order, the first and last dates are labelled, and the y-axis shows at least three labelled INR values spanning the plotted range

#### Scenario: Hover tooltip
- **WHEN** the pointer is over the chart nearest the 2026-10-01 row with equity 997574.57
- **THEN** a tooltip reads "1 Oct 2026", "₹9,97,575" and that row's return %

#### Scenario: Keyboard tooltip
- **WHEN** the chart has keyboard focus and the user presses the left arrow key
- **THEN** the tooltip moves to the previous point and its text is announced to assistive technology

#### Scenario: Single row
- **WHEN** `v_equity_daily` has one row
- **THEN** the page shows that value and a note that the curve starts after the first fill, rather than a broken chart

### Requirement: Open positions table
The page SHALL list every row of `v_open_positions` with symbol, fill date and fill price, last close, P&L % (`unrealized_pct`), current stop and distance to stop (`dist_to_stop_pct`). A row whose distance to stop is at or below 3% SHALL be visually highlighted as near-stop. The 3% threshold is a fixed UI constant. Each row SHALL link to `/trade/[signal_id]`. The list SHALL follow the responsive layout requirement.

#### Scenario: Near-stop highlight
- **WHEN** a position has `dist_to_stop_pct = 2.8`
- **THEN** its row or card is highlighted as near-stop

#### Scenario: Not near stop
- **WHEN** a position has `dist_to_stop_pct = 4.74`
- **THEN** its row or card is not highlighted

#### Scenario: No open positions
- **WHEN** `v_open_positions` returns no rows
- **THEN** the section shows "No open positions" instead of an empty table

### Requirement: Closed trades table
The page SHALL list every position with status `closed`, showing symbol, entry date and price, exit date and price, exit reason, and realised P&L, newest exit first. Each row SHALL link to `/trade/[signal_id]`. The list SHALL follow the responsive layout requirement.

#### Scenario: Stop-out listed
- **WHEN** a position closed on a stop hit
- **THEN** its row shows exit reason "stop_hit" and its realised P&L as a signed INR amount

#### Scenario: No closed trades
- **WHEN** no position is closed
- **THEN** the section shows "No closed trades yet"

### Requirement: Pending entries
The page SHALL list every position with status `pending`, showing symbol, verdict (ENTRY or ENTRY_REDUCED), entry zone (entry_low to entry_high), entry window (window_start to window_end) and initial stop. Each row SHALL link to `/trade/[signal_id]`. The list SHALL follow the responsive layout requirement.

#### Scenario: Pending ENTRY_REDUCED
- **WHEN** a pending position comes from an ENTRY_REDUCED signal with window 2026-10-05 to 2026-10-09
- **THEN** its row shows verdict ENTRY_REDUCED and the window "5 Oct 2026 – 9 Oct 2026"

#### Scenario: No pending entries
- **WHEN** no position is pending
- **THEN** the section shows "No pending entries"

### Requirement: Retro-seeded marker
Rows in every list whose originating signal is retro-seeded SHALL show a small "retro" badge. Its explanation ("Retro-seeded: the signal was recorded after the fact") SHALL be shown as a tooltip that opens on tap, click or keyboard activation, and SHALL NOT depend on mouse hover alone.

#### Scenario: Retro-seeded trade
- **WHEN** a listed position's signal has `retro_seeded = true`
- **THEN** its row shows a "retro" badge

#### Scenario: Tooltip on touch
- **WHEN** a phone user taps the "retro" badge
- **THEN** the explanation text appears, and tapping elsewhere closes it

#### Scenario: Tooltip by keyboard
- **WHEN** a keyboard user tabs to the badge and presses Enter
- **THEN** the explanation text appears

### Requirement: Stable trade identity
Wherever the page identifies a trade (row keys, anchors, any future links), it SHALL use the originating `signal_id`, never the position id, because position ids change on every ledger replay.

#### Scenario: After a ledger replay
- **WHEN** the ledger is replayed and position ids change
- **THEN** each trade's identifier on the page is unchanged

### Requirement: Indian formatting and IST
Money SHALL be shown in INR with Indian digit grouping (e.g. ₹1,50,000 and −₹1,234.50). Calendar dates SHALL be shown as stored, without any timezone shift (e.g. "28 Sep 2026"). Any timestamp SHALL be shown in Asia/Kolkata time.

#### Scenario: Lakh grouping
- **WHEN** the value 150000 is displayed as money
- **THEN** it reads "₹1,50,000"

#### Scenario: Date not shifted
- **WHEN** a `date` value 2026-09-28 is rendered on a server running in UTC
- **THEN** it reads "28 Sep 2026"

### Requirement: Fresh data on each visit and graceful failure
Each page request SHALL read current data from the database, with no stale cache across visits. If the database is unreachable, the page SHALL show a clear error message instead of empty sections.

#### Scenario: New run processed
- **WHEN** a run updates the ledger and the page is then reloaded
- **THEN** the page shows the new figures

#### Scenario: Database unreachable
- **WHEN** the Supabase request fails
- **THEN** the page shows "Tracker database is unreachable" and no zero or empty figures

### Requirement: Hosted on Render free tier
The dashboard SHALL run as a Render web service on the free plan, with no keep-alive pinging. A slow first request after idle (cold start) is acceptable.

#### Scenario: Cold start
- **WHEN** the service has been idle and spun down
- **THEN** the next request eventually renders the page, with no external pinger configured

### Requirement: Responsive lists on narrow screens
Below 640px viewport width, every tabular list on the site SHALL render each row as a card instead of a table row.
- Every column SHALL appear in its card. No column SHALL be hidden.
- For position lists, the card's first line SHALL show the symbol together with its P&L (or P&L %) and its stop.
- The page SHALL NOT need horizontal scrolling to read any value.
- At 640px and wider, lists SHALL render as tables.

#### Scenario: Open position on a phone
- **WHEN** the page is viewed 360px wide and there is an open position
- **THEN** its card shows symbol, P&L %, stop and distance to stop without any horizontal scroll, and also shows fill date, fill price and last close

#### Scenario: Desktop
- **WHEN** the page is viewed 1024px wide
- **THEN** the same lists render as tables with column headers

### Requirement: Site navigation
Every page SHALL show a header nav linking to Home (`/`), Review (`/review`) and Runs (`/runs`), with the current page marked as current for assistive technology.

#### Scenario: Navigate to Runs
- **WHEN** the user selects "Runs" in the header on `/`
- **THEN** `/runs` loads and its nav link is marked current


## MODIFIED Requirements

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

## ADDED Requirements

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

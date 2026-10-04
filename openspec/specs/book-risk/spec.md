# book-risk Specification

## Purpose
Shows on the dashboard how much of the paper book is at risk, how much cash is committed to pending entries, and how full the book is, read from the single-row `v_book_risk` view.
## Requirements
### Requirement: Book risk strip
The dashboard SHALL show a "Book risk" strip directly below the summary tiles. It SHALL show these values from the single `v_book_risk` row:
- equity
- cash with `cash_pct`
- open risk as `open_risk_rupees` with `open_risk_pct`
- `pending_committed_rupees`
- `cash_after_pending`
- open positions as "`open_positions` / `max_open_positions`"
- the `as_of` date

Every value SHALL be shown as stored, with display formatting only.

#### Scenario: Live row
- **WHEN** `v_book_risk` returns equity 997574.57, cash 800172.12, cash_pct 80.21, open_risk_rupees 13237, open_risk_pct 1.33, pending_committed_rupees 100000, cash_after_pending 700172, open_positions 2, max_open_positions 10, as_of 2026-10-01
- **THEN** the strip shows "₹9,97,575", "₹8,00,172 · 80.21%", "₹13,237 · 1.33%", "₹1,00,000", "₹7,00,172", "2 / 10" and "as of 1 Oct 2026"

#### Scenario: Strip on a phone
- **WHEN** the page is 360px wide
- **THEN** all seven values are visible as a wrapped grid, with no horizontal scrolling

#### Scenario: View returns no row
- **WHEN** `v_book_risk` returns no row
- **THEN** the strip shows "Book risk not available yet" and no zero figures

#### Scenario: Read fails
- **WHEN** the `v_book_risk` read returns an error
- **THEN** the page shows "Tracker database is unreachable", as for any other failed read


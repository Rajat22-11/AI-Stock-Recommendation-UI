## Purpose

Shows on the dashboard the agent's current ideas, one per symbol, split into ready-to-enter and watch lists. Each idea shows its plan, its rule checklist and its written reasoning, so the call can be judged on its own merits, independent of paper cash.

## ADDED Requirements

### Requirement: Source and placement
The dashboard SHALL show a section titled "Current ideas" below the book risk strip and above the equity curve. Its rows SHALL come only from `v_suggestions`. The subtitle SHALL say the list is the latest idea per symbol over the last 31 days. The section SHALL NOT filter rows by cash, position status or fundability. The rows `v_suggestions` returns are the rows shown.

#### Scenario: Section order
- **WHEN** the dashboard renders
- **THEN** "Current ideas" appears after the book risk strip and before "Equity curve"

#### Scenario: Unfundable idea still listed
- **WHEN** a `v_suggestions` row has `fundable_now = false`
- **THEN** the idea is still listed

### Requirement: Entry and Watch tabs
The section SHALL have two tabs:
- **Entry:** rows with `bucket = 'entry'`
- **Watch:** rows with `bucket = 'watch'`

Each tab label SHALL show its row count. Entry SHALL be selected by default. The selected tab SHALL be reflected in the URL so a link opens the same tab. Within a tab, rows SHALL be ordered the same way the view orders them: `priority_rank` ascending with nulls last, then `rr_plan` descending with nulls last.

#### Scenario: Default tab
- **WHEN** `/` is opened with no tab in the URL and v_suggestions has 2 entry and 20 watch rows
- **THEN** the Entry tab is selected showing 2 cards, and the tabs read "Entry 2" and "Watch 20"

#### Scenario: Shared Watch link
- **WHEN** a URL selecting the Watch tab is opened
- **THEN** the Watch tab is selected and shows the watch rows

#### Scenario: Empty tab
- **WHEN** a tab has no rows
- **THEN** it shows "No entry ideas right now" or "Nothing on the watch list" instead of an empty list

### Requirement: Idea card contents
Each idea SHALL render as a card showing:
- symbol, signal date, and a retro badge when `retro_seeded`
- verdict (ENTRY_REDUCED marked as half size)
- entry zone (`entry_ref` to `entry_high`)
- stop (`stop_ref`) and trim (`trim_ref`)
- R:R (`rr_plan`, shown as "1 : x")
- rupee risk (`rupee_risk`) and rupee reward at trim (`rupee_reward_at_trim`)
- size % (`size_pct`)
- confidence (`confidence` out of 5, or "n/a" when null)
- book status (`book_status` with `book_reason` when present)

Watch cards SHALL also show the alert trigger (`alert_trigger`) and required volume (`req_vol_abs`) when present. A missing value SHALL read "n/a", never zero. Each card SHALL link to `/trade/[signal_id]`.

#### Scenario: BOSCH_HCIL entry card
- **WHEN** the row has verdict ENTRY_REDUCED, entry_ref 1967.2, stop_ref 1809.82, trim_ref 2459.0, rr_plan 3.12, rupee_risk 4000, confidence 3, book_status pending
- **THEN** the card shows "ENTRY_REDUCED · half size", stop "1,809.82", trim "2,459.00", "1 : 3.12", "₹4,000", "3 / 5" and "pending"

#### Scenario: Watch card without rationale
- **WHEN** a watch row has confidence null and alert_trigger 817.55
- **THEN** the card shows confidence "n/a" and trigger "817.55"

### Requirement: Checklist chips
Each card SHALL show the checklist counts as chips:
- a green chip for `passes`
- an amber chip for `weak`
- a red chip for `fails`

Each chip SHALL show its count and a text or symbol label as well as its colour. When `failed_rules` is present, the card SHALL list those rule names. A chip whose count is zero SHALL be shown muted.

#### Scenario: SUNFLAG chips
- **WHEN** the row has passes 5, weak 2, fails 2 and failed_rules "Close location in weekly range; Fundamental why (grade)"
- **THEN** the card shows a green "✓ 5", an amber "~ 2" and a red "✗ 2" chip, and lists both failed rules

#### Scenario: Colour is not the only signal
- **WHEN** the card is viewed without colour
- **THEN** each chip's meaning is still readable from its symbol and accessible label

### Requirement: Not-fundable badge
A card whose row has `fundable_now = false` SHALL show a "Not fundable in paper book" badge. Its explanation SHALL be reachable by tap or keyboard, and SHALL show the planned position value (`position_value`) against the paper book's cash (`book_cash`). A card with `fundable_now` true or null SHALL NOT show the badge.

#### Scenario: Unfundable
- **WHEN** a row has `fundable_now = false`
- **THEN** its card shows "Not fundable in paper book"

#### Scenario: Fundable
- **WHEN** a row has `fundable_now = true`
- **THEN** no fundability badge is shown

### Requirement: Why expander
Each card SHALL have a collapsed "Why" expander. When opened, it SHALL show, under their own headings:
- the why-grade with `why_text`
- thesis
- catalyst
- risks
- invalidation
- alternatives considered
- data gaps

A heading whose value is null SHALL be omitted. When all six rationale fields are null, the expander SHALL say "No written rationale for this idea" and still show the why-grade and `why_text` if present. The expander SHALL work without client-side JavaScript.

#### Scenario: Entry with rationale
- **WHEN** the BOSCH_HCIL row has a thesis and catalyst
- **THEN** opening "Why" shows them under "Thesis" and "Catalyst"

#### Scenario: Watch without rationale
- **WHEN** a watch row has all rationale fields null
- **THEN** opening "Why" shows "No written rationale for this idea"

### Requirement: Disclaimer
The section SHALL end with the line "Paper-trading ideas, not investment advice."

#### Scenario: Footer present
- **WHEN** the section renders, with or without rows
- **THEN** its last line is "Paper-trading ideas, not investment advice."

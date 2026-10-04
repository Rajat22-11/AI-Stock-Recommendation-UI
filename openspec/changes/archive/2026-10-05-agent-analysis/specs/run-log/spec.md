## Purpose

A read-only `/runs` page listing every agent run with its verdict mix, summary, observations, lessons and proposed rule change, each linked to the signals it produced. It shows how the agent's process changes over time.

## ADDED Requirements

### Requirement: Run list
The page SHALL list every `v_run_log` row, newest `started_at` first. Each run SHALL have the anchor `run-{run_id}` and show:
- run type, data-as-of date and start time in IST
- status
- skill version and model
- summary

A run whose status is not `succeeded` SHALL show its status as a visible marker.

#### Scenario: Partial run
- **WHEN** run 1 has status partial
- **THEN** its card shows a "partial" marker

#### Scenario: No runs
- **WHEN** `v_run_log` returns no rows
- **THEN** the page shows "No runs recorded yet"

### Requirement: Verdict mix
Each run SHALL show its `verdicts` object as a proportional bar plus a chip per verdict with its count, in a fixed verdict order: ENTRY, ENTRY_REDUCED, WAIT_ALERT, WAIT, HOLD, NO_GO, then any other key alphabetically. Each verdict SHALL keep the same colour on every run. Counts SHALL be shown as text, not by colour alone. A run with null or empty `verdicts` SHALL show "No verdicts".

#### Scenario: Weekly scan mix
- **WHEN** run 3 has verdicts {"HOLD":4,"WAIT":1,"NO_GO":3,"WAIT_ALERT":19,"ENTRY_REDUCED":2}
- **THEN** the chips read "ENTRY_REDUCED 2", "WAIT_ALERT 19", "WAIT 1", "HOLD 4", "NO_GO 3" in that order, and the bar segments are proportional to 29

### Requirement: Agent notes
Each run SHALL show `observations`, `lessons` and `proposed_change` under those headings when present, with `proposal_status` shown beside the proposed change. Long text SHALL be collapsed behind an expander that works without client-side JavaScript. Null fields SHALL be omitted.

#### Scenario: Lessons present
- **WHEN** run 3 has lessons text and proposal_status "none"
- **THEN** the card shows a "Lessons" block with that text, and no "Proposed change" block because proposed_change is null

### Requirement: Links to signals
Each run SHALL list the signals whose `run_id` is that run, as chips showing symbol and verdict, linking to `/trade/[signal_id]`. Chips SHALL be grouped by verdict in the same order as the verdict mix. A run with more than 12 signals SHALL show the first 12 with the rest behind a "Show all N" expander.

#### Scenario: Run with 29 signals
- **WHEN** run 3 produced 29 signals
- **THEN** 12 chips are shown and "Show all 29" reveals the rest, each linking to its trade page

#### Scenario: Trade page links back
- **WHEN** a trade page links to `/runs#run-3`
- **THEN** the browser scrolls to run 3's card

### Requirement: Fresh, read-only, graceful
The page SHALL read current data on every request, SHALL NOT write, and SHALL show "Tracker database is unreachable" if any read fails.

#### Scenario: Read failure
- **WHEN** the `v_run_log` read fails
- **THEN** the page shows "Tracker database is unreachable"

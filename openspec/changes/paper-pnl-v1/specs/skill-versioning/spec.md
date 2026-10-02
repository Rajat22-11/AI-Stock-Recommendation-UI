## Purpose

Ensures each new version of the breakout skill file gets exactly one label in the tracker, so runs, signals and stats grouped by skill version are not split by duplicate labels.

## ADDED Requirements

### Requirement: Runs reuse the label for a known hash
The tracker protocol (step 1) SHALL instruct each run to look up `skill_versions` by the skill file's sha256 first and reuse that row's label. A new label SHALL be created only for a hash not yet recorded, dated the day it first runs.

#### Scenario: Run with an unchanged skill file
- **WHEN** a run starts and the skill file's sha256 matches an existing `skill_versions` row
- **THEN** the run and its signals use that existing label, and no new `skill_versions` row is created

#### Scenario: Run with a changed skill file
- **WHEN** a run starts and the skill file's sha256 has no `skill_versions` row
- **THEN** one new row is created, labelled with that run's date and the first 8 hex characters of the hash

### Requirement: Signals are never edited to fix labels
Correcting skill-version labels SHALL NOT update or delete any `signals` row and SHALL NOT disable the `signals_append_only` trigger. The existing duplicate (`2026-10-01-8169f728` and `2026-10-02-8169f728`, same sha256) is left in place for v1.

#### Scenario: After this change
- **WHEN** the change is applied
- **THEN** every signal row is unchanged and `signals_append_only` is enabled

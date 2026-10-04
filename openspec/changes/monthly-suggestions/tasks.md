## 1. Prep

- [x] 1.1 Read the relevant Next 16 guides in `node_modules/next/dist/docs/01-app` (server components, `connection()`, data fetching) and note any deprecations that touch the new component
- [x] 1.2 Confirm in Supabase that the anon key can select the needed `signals` columns with `positions(...)` embedded, and that the embed comes back as a single object (design D3)

## 2. Data layer

- [x] 2.1 Add an IST month-bounds helper (`monthStart`, `nextMonthStart`, month label) using `Intl.DateTimeFormat` with `Asia/Kolkata` and string arithmetic only (design D2), including the December→January rollover
- [x] 2.2 Add `Suggestion`, `WatchAlert` and embedded `PositionStatus` row types to `src/lib/types.ts`, and extend `Dashboard` with `suggestions`, `alerts` and `monthLabel`
- [x] 2.3 Add the month-signals read and the superseded-ids read to the existing `Promise.all` in `src/lib/queries.ts` (design D1). Throw on any error
- [x] 2.4 In `queries.ts`, drop superseded ids, normalise the embed (D3), split into suggestions (ENTRY, ENTRY_REDUCED) and alerts (WAIT_ALERT), and keep the latest alert per symbol

## 3. Formatting

- [x] 3.1 Add the "n/a" variant for checklist values, and an Indian-grouped integer formatter for `req_vol_abs` (e.g. 23577470 → "2,35,77,470")
- [x] 3.2 Add the close-vs-pivot helper: returns null when either input is null or pivot is 0 (design D5)

## 4. UI

- [x] 4.1 Add a `WhyGrade` badge to `src/components/ui.tsx` in the existing chip style (design D7)
- [x] 4.2 Build `src/components/Suggestions.tsx`: table with symbol + retro badge, signal date, verdict + "half size" marker, entry zone, stop/trim (filled vs "planned", design D4), size %, window and paper status ("skipped · <reason>", "not in ledger yet")
- [x] 4.3 Add the per-row "Why" `<details>` (collapsed): grade badge, why_text, and the checklist with pass/fail marks only for close > pivot, vol_mult ≥ 2 and sma13_rising; show `req_vol_mult` beside volume when it isn't 2; show "n/a" for nulls
- [x] 4.4 Add the collapsed "Watchlist alerts" `<details>` with count, rows (symbol + retro badge, date, trigger, required volume) and empty state
- [x] 4.5 Add the empty state "No suggestions this month" and the footer "Paper-trading signals, not investment advice."
- [x] 4.6 Render `<Suggestions>` in `src/app/page.tsx` between the summary tiles and "Equity curve", with no client components added

## 5. Verify

- [x] 5.1 `npm run lint` and `npm run build` pass
- [x] 5.2 Against live data on the current date, check that the October list is exactly the non-provisional, non-superseded ENTRY/ENTRY_REDUCED signals this month (today SUNFLAG and BOSCH_HCIL), newest first, and that the September batch and provisional SOMANYCERA are absent
- [x] 5.3 Check the scenarios with known values: BOSCH_HCIL close vs pivot "+4.01%" and volume "3.10× vs 2×" pass; a vol_mult below 2 is marked fail (check with a fixture row if no live suggestion has one); duplicate WAIT_ALERT symbols appear once; null checklist values read "n/a"
- [x] 5.4 Check the month boundary helper with a fixed instant (2026-10-31T19:00Z → November) and the December rollover
- [x] 5.5 Check the layout at phone width (no page-level horizontal scroll, and expanders usable) and that the page still shows "Tracker database is unreachable" when Supabase is unreachable
- [x] 5.6 Confirm no Supabase migration was added (`list_migrations` unchanged)

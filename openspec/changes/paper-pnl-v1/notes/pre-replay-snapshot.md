# Ledger snapshot before the ₹1.5L replay

Taken 2026-10-02, before task 3.2. `paper_capital = 1000000`, `processed_through = 2026-10-01`.

Positions: 4 open, 4 closed, 2 pending. Realized P&L (sum of events.pnl): −₹17,465.78.

| signal_id | symbol | status | qty | fill | exit | reason | realized |
|---|---|---|---|---|---|---|---|
| 1 | ENGINERSIN | open | 315 | 316.90 | | | −249.56 |
| 2 | JSWINFRA | closed | 275 | 362.95 | 353.38 | stop_hit | −3,124.23 |
| 3 | MUKANDLTD | open | 584 | 170.95 | | | −249.59 |
| 4 | SOMANYCERA | open | 161 | 618.05 | | | −248.77 |
| 5 | SHANTIGOLD | open | 317 | 315.00 | | | −249.64 |
| 6 | STEELCAS | closed | 263 | 379.50 | 360.36 | stop_hit | −5,520.28 |
| 7 | ROLEXRINGS | closed | 505 | 197.87 | 187.51 | stop_hit | −5,718.34 |
| 8 | ABDL | closed | 68 | 731.95 | 704.58 | stop_hit | −2,105.37 |
| 28 | BOSCH_HCIL | pending | | | | | 0 |
| 29 | SUNFLAG | pending | | | | | 0 |

Equity (v_equity_daily):

| as_of | equity | return % |
|---|---|---|
| 2026-09-28 | 9,87,591.91 | −1.241 |
| 2026-09-29 | 9,84,026.41 | −1.597 |
| 2026-09-30 | 9,90,817.77 | −0.918 |
| 2026-10-01 | 9,77,976.11 | −2.202 |

Rollback: set `paper_capital` back to 1000000 and run `process_ledger('2026-10-01')`; the ledger is a deterministic replay.

# Request to the price agent: backfill `price_bars`

**Status:** open, raised 2026-10-05. Not done by this repo, which is read-only.

**Why:** the weekly candlestick chart on `/trade/[signal_id]` needs at least 4 weekly candles. On 2026-10-05, `price_bars` held 4 daily bars per symbol (2026-09-28 .. 2026-10-01), which is one week. Until there are 4 weeks, the page shows "Not enough price history yet (N weeks)". It switches to a chart with no code change once 4 or more weeks exist.

**Ask:**
- Insert daily OHLCV for every symbol in `signals` going back 52 weeks (about 260 trading days) from the latest bar, using the same columns and `source` convention as today's rows.
- Then keep the history rolling forward with each run.

**Check after the backfill:**

```sql
select symbol, count(*) bars, min(bar_date), max(bar_date)
from price_bars group by symbol order by bars;
```

Each signalled symbol should show about 250 bars.

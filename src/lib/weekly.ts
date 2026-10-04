// Weekly (W-FRI) candles from daily price_bars. This is the one place the site derives
// prices itself (spec: pnl-dashboard, "Figures come from the database"; trade-detail,
// "Weekly candlestick chart"). Dates are handled as YYYY-MM-DD strings with UTC
// calendar arithmetic, so the server's timezone never shifts a bar into another week.
import type { Num, PriceBar } from "./types";

export type Candle = {
  /** The Friday that ends the week, "YYYY-MM-DD". */
  weekEnd: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const DAY_MS = 86_400_000;
const FRIDAY = 5;

/** The first Friday on or after a date: Mon 2026-09-28 → "2026-10-02"; Sat 2026-10-03 → "2026-10-09". */
export function weekEnding(date: string): string {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const dow = new Date(t).getUTCDay();
  return new Date(t + ((FRIDAY - dow + 7) % 7) * DAY_MS).toISOString().slice(0, 10);
}

/** Groups daily bars (any order) into weekly candles, oldest first. */
export function toWeekly(bars: PriceBar[]): Candle[] {
  const sorted = [...bars].sort((a, b) => (a.bar_date < b.bar_date ? -1 : a.bar_date > b.bar_date ? 1 : 0));
  const weeks: Candle[] = [];
  for (const b of sorted) {
    const key = weekEnding(b.bar_date);
    const cur = weeks.at(-1);
    if (cur && cur.weekEnd === key) {
      cur.high = Math.max(cur.high, n(b.high));
      cur.low = Math.min(cur.low, n(b.low));
      cur.close = n(b.close);
      cur.volume += n(b.volume);
    } else {
      weeks.push({
        weekEnd: key,
        open: n(b.open),
        high: n(b.high),
        low: n(b.low),
        close: n(b.close),
        volume: n(b.volume),
      });
    }
  }
  return weeks;
}

function n(v: Num | null): number {
  return v === null ? 0 : Number(v);
}

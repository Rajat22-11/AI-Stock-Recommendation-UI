import "server-only";
import { supabase } from "./supabase";
import type {
  ClosedTrade,
  Dashboard,
  EquityRow,
  OpenPosition,
  PendingEntry,
} from "./types";

// Every figure comes from a DB view or table; this module only selects and orders.
export async function getDashboard(): Promise<Dashboard> {
  const db = supabase();
  const [equity, open, closed, pending, through] = await Promise.all([
    db
      .from("v_equity_daily")
      .select("as_of, capital, equity, realized_cum, unrealized, return_pct")
      .order("as_of"),
    db
      .from("v_open_positions")
      .select(
        "signal_id, symbol, verdict, retro_seeded, fill_date, fill_price, last_close, unrealized_pct, stop_current, dist_to_stop_pct",
      )
      .order("dist_to_stop_pct", { ascending: true, nullsFirst: false }),
    db
      .from("v_positions")
      .select(
        "signal_id, symbol, verdict, retro_seeded, fill_date, fill_price, exit_date, exit_price, exit_reason, realized_pnl",
      )
      .eq("status", "closed")
      .order("exit_date", { ascending: false })
      .order("signal_id"),
    db
      .from("positions")
      .select(
        "signal_id, symbol, entry_low, entry_high, window_start, window_end, stop_initial, signals(verdict, retro_seeded)",
      )
      .eq("status", "pending")
      .order("window_start")
      .order("signal_id"),
    db.from("config").select("value").eq("key", "processed_through").maybeSingle(),
  ]);

  for (const r of [equity, open, closed, pending, through]) {
    if (r.error) throw new Error(`Supabase read failed: ${r.error.message}`);
  }

  return {
    equity: (equity.data ?? []) as EquityRow[],
    open: (open.data ?? []) as OpenPosition[],
    closed: (closed.data ?? []) as ClosedTrade[],
    pending: (pending.data ?? []) as unknown as PendingEntry[],
    processedThrough:
      typeof through.data?.value === "string" ? through.data.value : null,
  };
}

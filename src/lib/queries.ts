import "server-only";
import { istMonth } from "./dates";
import { supabase } from "./supabase";
import type {
  ClosedTrade,
  Dashboard,
  EquityRow,
  OpenPosition,
  PendingEntry,
  PositionStatus,
  Suggestion,
  WatchAlert,
} from "./types";

const SUGGESTION_VERDICTS = ["ENTRY", "ENTRY_REDUCED"];
const ALERT_VERDICT = "WAIT_ALERT";

type MonthSignal = Omit<Suggestion, "positions"> & {
  alert_trigger: WatchAlert["alert_trigger"];
  req_vol_abs: WatchAlert["req_vol_abs"];
  // signal_id is UNIQUE on positions, so PostgREST embeds one object; tolerate an array anyway.
  positions: PositionStatus | PositionStatus[] | null;
};

// Every figure comes from a DB view or table; this module only selects and orders.
export async function getDashboard(): Promise<Dashboard> {
  const db = supabase();
  const month = istMonth();
  const [equity, open, closed, pending, through, monthSignals, superseding] = await Promise.all([
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
    db
      .from("signals")
      .select(
        "id, symbol, signal_date, verdict, retro_seeded, why_grade, why_text, signal_close, pivot, alert_trigger, entry_low, entry_high, stop, trim_price, size_pct, vol_mult, req_vol_mult, req_vol_abs, sma13_rising, dist_sma_pct, correction_pct, base_range_pct, close_loc, liquidity_tier, window_start, window_end, positions(status, exit_reason, fill_date, stop_at_fill, trim_price)",
      )
      .in("verdict", [...SUGGESTION_VERDICTS, ALERT_VERDICT])
      .eq("provisional", false)
      .gte("signal_date", month.start)
      .lt("signal_date", month.next)
      .order("signal_date", { ascending: false })
      .order("id", { ascending: false }),
    // A signal is superseded when a later signal points at it; there is no flag column.
    db.from("signals").select("supersedes").not("supersedes", "is", null),
  ]);

  for (const r of [equity, open, closed, pending, through, monthSignals, superseding]) {
    if (r.error) throw new Error(`Supabase read failed: ${r.error.message}`);
  }

  return {
    equity: (equity.data ?? []) as EquityRow[],
    open: (open.data ?? []) as OpenPosition[],
    closed: (closed.data ?? []) as ClosedTrade[],
    pending: (pending.data ?? []) as unknown as PendingEntry[],
    processedThrough:
      typeof through.data?.value === "string" ? through.data.value : null,
    ...splitMonthSignals(
      (monthSignals.data ?? []) as unknown as MonthSignal[],
      new Set((superseding.data ?? []).map((r) => Number(r.supersedes))),
    ),
    monthLabel: month.label,
  };
}

// Rows arrive newest first; this only filters and picks, it computes no figures.
function splitMonthSignals(rows: MonthSignal[], supersededIds: Set<number>) {
  const suggestions: Suggestion[] = [];
  const alerts: WatchAlert[] = [];
  const alerted = new Set<string>();

  for (const row of rows) {
    if (supersededIds.has(Number(row.id))) continue;
    const { alert_trigger, req_vol_abs, positions, ...signal } = row;

    if (SUGGESTION_VERDICTS.includes(row.verdict)) {
      const position = Array.isArray(positions) ? (positions[0] ?? null) : positions;
      suggestions.push({ ...signal, positions: position });
    } else if (row.verdict === ALERT_VERDICT && !alerted.has(row.symbol)) {
      alerted.add(row.symbol);
      alerts.push({
        id: row.id,
        symbol: row.symbol,
        signal_date: row.signal_date,
        retro_seeded: row.retro_seeded,
        alert_trigger,
        req_vol_abs,
      });
    }
  }

  return { suggestions, alerts };
}

import "server-only";
import { cache } from "react";
import { supabase } from "./supabase";
import type {
  BookRisk,
  ChecklistRow,
  ClosedTrade,
  Dashboard,
  EquityRow,
  Idea,
  LedgerEvent,
  OpenPosition,
  PendingEntry,
  Plan,
  PositionLite,
  PriceBar,
  Rationale,
  Review,
  ReviewNote,
  RuleEffect,
  RunRow,
  RunSignal,
  SignalOutcome,
  Trade,
  TradeReviewRow,
  TradeStat,
} from "./types";

// Every figure comes from a DB view or table; this module only selects and orders.
// Each reader runs its selects in one Promise.all and throws on any error, so a page
// either has all its data or shows the "unreachable" error.

type Result = { error: { message: string } | null };

function check(...results: Result[]) {
  for (const r of results) {
    if (r.error) throw new Error(`Supabase read failed: ${r.error.message}`);
  }
}

const PLAN_COLUMNS =
  "signal_id, run_id, symbol, signal_date, verdict, setup, stage, why_grade, priority_rank, excluded, retro_seeded, skill_version, entry_ref, entry_high, stop_ref, trim_ref, size_pct, risk_pct_plan, reward_pct_plan, rr_plan, position_value, rupee_risk, rupee_reward_at_trim, capital_risk_pct, passes, weak, fails, failed_rules, book_status, book_reason";

const RATIONALE_COLUMNS = "thesis, catalyst, risks, invalidation, alternatives, data_gaps, confidence";

const REVIEW_COLUMNS =
  "signal_id, symbol, verdict, why_grade, status, fill_date, fill_price, stop_at_fill, trim_price, exit_date, exit_price, exit_reason, realized_pnl, r_multiple, days_held, skill_stop, mfe_pct, mae_pct, skill_stop_still_intact, post_exit_run_pct, auto_tag, review_tag, review_lesson, review_author";

export async function getDashboard(): Promise<Dashboard> {
  const db = supabase();
  const [equity, open, closed, pending, through, bookRisk, ideas] = await Promise.all([
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
      .from("v_book_risk")
      .select(
        "as_of, equity, cash, cash_pct, open_positions, max_open_positions, open_risk_rupees, open_risk_pct, pending_committed_rupees, cash_after_pending",
      )
      .maybeSingle(),
    db
      .from("v_suggestions")
      .select(
        `bucket, ${PLAN_COLUMNS}, why_text, alert_trigger, req_vol_abs, ${RATIONALE_COLUMNS}, book_cash, fundable_now`,
      )
      .order("priority_rank", { ascending: true, nullsFirst: false })
      .order("rr_plan", { ascending: false, nullsFirst: false }),
  ]);
  check(equity, open, closed, pending, through, bookRisk, ideas);

  return {
    equity: (equity.data ?? []) as EquityRow[],
    open: (open.data ?? []) as OpenPosition[],
    closed: (closed.data ?? []) as ClosedTrade[],
    pending: (pending.data ?? []) as unknown as PendingEntry[],
    processedThrough: typeof through.data?.value === "string" ? through.data.value : null,
    bookRisk: (bookRisk.data ?? null) as BookRisk | null,
    ideas: (ideas.data ?? []) as unknown as Idea[],
  };
}

/** Bars older than this many days before the latest bar are not charted (52 weeks + slack). */
const BAR_LOOKBACK_DAYS = 371;

/**
 * Everything the trade page shows for one signal, or null when the signal has no plan row.
 * Wrapped in cache() so generateMetadata and the page share one set of reads per request.
 */
export const getTrade = cache(async (signalId: number): Promise<Trade | null> => {
  const db = supabase();
  const [plan, signal, rationale, checklist, review, note, position, events, exclusion] =
    await Promise.all([
      db.from("v_signal_plan").select(PLAN_COLUMNS).eq("signal_id", signalId).maybeSingle(),
      db.from("signals").select("why_text, pivot").eq("id", signalId).maybeSingle(),
      db.from("signal_rationale").select(RATIONALE_COLUMNS).eq("signal_id", signalId).maybeSingle(),
      db
        .from("v_signal_checklist")
        .select("ord, rule, measured, target, status")
        .eq("signal_id", signalId)
        .order("ord"),
      db.from("v_trade_review").select(REVIEW_COLUMNS).eq("signal_id", signalId).maybeSingle(),
      db
        .from("trade_reviews")
        .select("signal_id, symbol, tag, lesson, author, created_at")
        .eq("signal_id", signalId)
        .order("created_at", { ascending: false })
        .limit(1),
      db
        .from("positions")
        .select("status, fill_date, fill_price, stop_current, exit_date, exit_price, exit_reason")
        .eq("signal_id", signalId)
        .maybeSingle(),
      db
        .from("events")
        .select("id, event_date, event_type, price, qty, pnl, rule")
        .eq("signal_id", signalId)
        .order("event_date")
        .order("id"),
      db.from("signal_exclusions").select("batch, reason").eq("signal_id", signalId).maybeSingle(),
    ]);
  check(plan, signal, rationale, checklist, review, note, position, events, exclusion);
  if (!plan.data) return null;

  const p = plan.data as unknown as Plan;
  const latest = await db
    .from("price_bars")
    .select("bar_date")
    .eq("symbol", p.symbol)
    .order("bar_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(latest);

  let bars: PriceBar[] = [];
  if (latest.data) {
    const barRows = await db
      .from("price_bars")
      .select("bar_date, open, high, low, close, volume")
      .eq("symbol", p.symbol)
      .gte("bar_date", daysBefore(latest.data.bar_date as string, BAR_LOOKBACK_DAYS))
      .order("bar_date");
    check(barRows);
    bars = (barRows.data ?? []) as PriceBar[];
  }

  return {
    plan: p,
    signal: (signal.data ?? { why_text: null, pivot: null }) as Trade["signal"],
    rationale: (rationale.data ?? null) as Rationale | null,
    checklist: (checklist.data ?? []) as ChecklistRow[],
    review: (review.data ?? null) as TradeReviewRow | null,
    note: ((note.data ?? [])[0] ?? null) as ReviewNote | null,
    position: (position.data ?? null) as PositionLite | null,
    events: (events.data ?? []) as LedgerEvent[],
    exclusion: (exclusion.data ?? null) as Trade["exclusion"],
    bars,
  };
});

/** "YYYY-MM-DD" minus n calendar days, as a date string (UTC arithmetic on a date, no timezone). */
function daysBefore(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - n * 86_400_000).toISOString().slice(0, 10);
}

export async function getReview(): Promise<Review> {
  const db = supabase();
  const [reviews, notes, positions, exclusions, outcomes, rules, stats] = await Promise.all([
    db.from("v_trade_review").select(REVIEW_COLUMNS),
    db
      .from("trade_reviews")
      .select("signal_id, symbol, tag, lesson, author, created_at, signals(verdict, signal_date)")
      .order("created_at", { ascending: false }),
    db.from("positions").select("signal_id, status"),
    db.from("signal_exclusions").select("signal_id"),
    db
      .from("v_signal_outcomes")
      .select(
        "signal_id, symbol, signal_date, verdict, provisional, trigger_hit_date, ret_4w_pct, max_up_4w_pct, max_down_4w_pct",
      )
      .order("signal_date", { ascending: false })
      .order("signal_id", { ascending: false }),
    db
      .from("v_rule_effectiveness")
      .select("ord, rule, status, trades, winners, avg_r, avg_return_pct")
      .order("ord"),
    db
      .from("v_trade_stats")
      .select(
        "dimension, verdict, why_grade, setup, skill_version, closed, open, not_filled, win_rate_pct, avg_return_pct, avg_r, avg_days_held, realized_pnl",
      )
      .order("grp")
      .order("verdict", { nullsFirst: false })
      .order("why_grade", { nullsFirst: false })
      .order("setup", { nullsFirst: false })
      .order("skill_version", { nullsFirst: false }),
  ]);
  check(reviews, notes, positions, exclusions, outcomes, rules, stats);

  return {
    reviews: (reviews.data ?? []) as TradeReviewRow[],
    notes: (notes.data ?? []) as unknown as Review["notes"],
    positioned: new Map((positions.data ?? []).map((r) => [Number(r.signal_id), String(r.status)])),
    excluded: new Set((exclusions.data ?? []).map((r) => Number(r.signal_id))),
    outcomes: (outcomes.data ?? []) as SignalOutcome[],
    rules: (rules.data ?? []) as RuleEffect[],
    stats: (stats.data ?? []) as TradeStat[],
  };
}

export async function getRuns(): Promise<{ runs: RunRow[]; signals: RunSignal[] }> {
  const db = supabase();
  const [runs, signals] = await Promise.all([
    db
      .from("v_run_log")
      .select(
        "run_id, run_type, data_as_of, started_at, skill_version, model, status, summary, verdicts, observations, lessons, proposed_change, proposal_status",
      )
      .order("started_at", { ascending: false, nullsFirst: false })
      .order("run_id", { ascending: false }),
    db.from("v_signal_plan").select("signal_id, run_id, symbol, verdict").order("symbol"),
  ]);
  check(runs, signals);
  return {
    runs: (runs.data ?? []) as RunRow[],
    signals: (signals.data ?? []) as RunSignal[],
  };
}

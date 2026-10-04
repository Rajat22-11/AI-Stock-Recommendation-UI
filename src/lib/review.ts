// Review classification: stored tags and figures compared against fixed UI constants,
// the same way near-stop works. Nothing here computes a trading figure.
import type { Tone } from "@/components/ui";
import type { Num, Review, SignalOutcome, TradeReviewRow } from "./types";

export const RIGHT_TAGS = new Set(["good_call", "winner"]);
export const WRONG_TAGS = new Set([
  "valid_stop",
  "whipsaw_tight_stop",
  "gap_through_stop",
  "bad_entry",
  "rule_violation",
  "loser",
]);
export const MISSED_TAGS = new Set(["missed_runner"]);
export const AVOIDED_TAGS = new Set(["avoided_loser"]);

/** A closed trade at or above this R multiple went right. */
export const R_RIGHT = 1;
/** A never-taken signal that triggered and ran this far up (max, 4 weeks) was missed. Matches the view's 1.15 missed_runner cut. */
export const MISSED_UP_PCT = 15;
/** A never-taken signal that fell this far (4-week return) was avoided. The strategy's 8% stop. */
export const AVOIDED_RET_PCT = -8;

export function toneOf(tag: string | null | undefined): Tone {
  if (!tag) return "neutral";
  if (RIGHT_TAGS.has(tag) || AVOIDED_TAGS.has(tag)) return "good";
  if (WRONG_TAGS.has(tag) || MISSED_TAGS.has(tag)) return "bad";
  return "neutral";
}

/** One reviewed signal, merged from v_trade_review (positions) and trade_reviews (any signal). */
export type Reviewed = {
  signalId: number;
  symbol: string;
  verdict: string | null;
  date: string | null;
  /** Position status, or null when the signal has no position. */
  status: string | null;
  autoTag: string | null;
  reviewTag: string | null;
  tag: string | null;
  lesson: string | null;
  author: string | null;
  rMultiple: Num | null;
  realizedPnl: Num | null;
  pilot: boolean;
};

export function mergeReviews(data: Review): Reviewed[] {
  const out = new Map<number, Reviewed>();
  for (const r of data.reviews) out.set(r.signal_id, fromPosition(r, data.excluded));
  for (const n of data.notes) {
    if (out.has(n.signal_id)) continue; // the view already carries this review
    out.set(n.signal_id, fromNote(n, data));
  }
  return [...out.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.signalId - a.signalId);
}

function fromPosition(r: TradeReviewRow, excluded: Set<number>): Reviewed {
  return {
    signalId: r.signal_id,
    symbol: r.symbol,
    verdict: r.verdict,
    date: r.exit_date ?? r.fill_date,
    status: r.status,
    autoTag: r.auto_tag,
    reviewTag: r.review_tag,
    tag: r.review_tag ?? r.auto_tag,
    lesson: r.review_lesson,
    author: r.review_author,
    rMultiple: r.r_multiple,
    realizedPnl: r.realized_pnl,
    pilot: excluded.has(r.signal_id),
  };
}

function fromNote(n: Review["notes"][number], data: Review): Reviewed {
  return {
    signalId: n.signal_id,
    symbol: n.symbol,
    verdict: n.signals?.verdict ?? null,
    date: n.signals?.signal_date ?? n.created_at.slice(0, 10),
    status: data.positioned.get(n.signal_id) ?? null,
    autoTag: null,
    reviewTag: n.tag,
    tag: n.tag,
    lesson: n.lesson,
    author: n.author,
    rMultiple: null,
    realizedPnl: null,
    pilot: data.excluded.has(n.signal_id),
  };
}

export type Buckets = {
  right: Reviewed[];
  wrong: Reviewed[];
  missed: { kind: "missed" | "avoided"; review?: Reviewed; outcome?: SignalOutcome }[];
  other: Reviewed[];
};

export function bucket(data: Review): Buckets {
  const b: Buckets = { right: [], wrong: [], missed: [], other: [] };
  for (const r of mergeReviews(data)) {
    const tag = r.tag ?? "";
    const rm = r.rMultiple === null ? null : Number(r.rMultiple);
    if (RIGHT_TAGS.has(tag) || (rm !== null && rm >= R_RIGHT)) b.right.push(r);
    else if (WRONG_TAGS.has(tag)) b.wrong.push(r);
    else if (MISSED_TAGS.has(tag)) b.missed.push({ kind: "missed", review: r });
    else if (AVOIDED_TAGS.has(tag)) b.missed.push({ kind: "avoided", review: r });
    // Positions still running carry auto tags open/pending/expired/skipped and no verdict on the call yet.
    else if (r.reviewTag) b.other.push(r);
  }

  const tagged = new Set(b.missed.map((m) => m.review?.signalId));
  for (const o of data.outcomes) {
    if (data.positioned.has(o.signal_id) || data.excluded.has(o.signal_id)) continue;
    if (o.provisional || o.verdict === "HOLD" || tagged.has(o.signal_id)) continue;
    const up = o.max_up_4w_pct === null ? null : Number(o.max_up_4w_pct);
    const ret = o.ret_4w_pct === null ? null : Number(o.ret_4w_pct);
    if (o.trigger_hit_date && up !== null && up >= MISSED_UP_PCT) b.missed.push({ kind: "missed", outcome: o });
    else if (ret !== null && ret <= AVOIDED_RET_PCT) b.missed.push({ kind: "avoided", outcome: o });
  }
  return b;
}

/** Human label for a position status on review lists. */
export function statusLabel(status: string | null): string {
  return status ?? "no position";
}

export function isUnresolved(status: string | null): boolean {
  return status === "open" || status === "pending";
}


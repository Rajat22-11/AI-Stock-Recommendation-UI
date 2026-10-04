// Row shapes for the site's reads. PostgREST may return numeric columns as
// numbers or strings, so money-like fields are typed as Num and formatted, never computed.
export type Num = number | string;

export type EquityRow = {
  as_of: string;
  capital: Num;
  equity: Num;
  realized_cum: Num;
  unrealized: Num;
  return_pct: Num;
};

export type OpenPosition = {
  signal_id: number;
  symbol: string;
  verdict: string;
  retro_seeded: boolean;
  fill_date: string;
  fill_price: Num;
  last_close: Num | null;
  unrealized_pct: Num | null;
  stop_current: Num;
  dist_to_stop_pct: Num | null;
};

export type ClosedTrade = {
  signal_id: number;
  symbol: string;
  verdict: string;
  retro_seeded: boolean;
  fill_date: string;
  fill_price: Num;
  exit_date: string;
  exit_price: Num;
  exit_reason: string | null;
  realized_pnl: Num;
};

export type PendingEntry = {
  signal_id: number;
  symbol: string;
  entry_low: Num | null;
  entry_high: Num | null;
  window_start: string;
  window_end: string;
  stop_initial: Num | null;
  signals: { verdict: string; retro_seeded: boolean } | null;
};

/** Single row of v_book_risk. */
export type BookRisk = {
  as_of: string;
  equity: Num;
  cash: Num;
  cash_pct: Num;
  open_positions: number;
  max_open_positions: number;
  open_risk_rupees: Num;
  open_risk_pct: Num;
  pending_committed_rupees: Num;
  cash_after_pending: Num;
};

/** Written reasoning shared by v_suggestions and signal_rationale. */
export type Rationale = {
  thesis: string | null;
  catalyst: string | null;
  risks: string | null;
  invalidation: string | null;
  alternatives: string | null;
  data_gaps: string | null;
  confidence: number | null;
};

/** Plan columns shared by v_signal_plan and v_suggestions. */
export type Plan = {
  signal_id: number;
  run_id: number | null;
  symbol: string;
  signal_date: string;
  verdict: string;
  setup: string | null;
  stage: number | null;
  why_grade: string | null;
  priority_rank: number | null;
  excluded: boolean;
  retro_seeded: boolean;
  skill_version: string | null;
  entry_ref: Num | null;
  entry_high: Num | null;
  stop_ref: Num | null;
  trim_ref: Num | null;
  size_pct: Num | null;
  risk_pct_plan: Num | null;
  reward_pct_plan: Num | null;
  rr_plan: Num | null;
  position_value: Num | null;
  rupee_risk: Num | null;
  rupee_reward_at_trim: Num | null;
  capital_risk_pct: Num | null;
  passes: number | null;
  weak: number | null;
  fails: number | null;
  failed_rules: string | null;
  book_status: string | null;
  book_reason: string | null;
};

/** A row of v_suggestions: the latest idea per symbol. */
export type Idea = Plan &
  Rationale & {
    bucket: "entry" | "watch";
    why_text: string | null;
    alert_trigger: Num | null;
    req_vol_abs: Num | null;
    book_cash: Num | null;
    fundable_now: boolean | null;
  };

export type ChecklistRow = {
  ord: number;
  rule: string;
  measured: string | null;
  target: string | null;
  status: string;
};

/** A row of v_trade_review: plan vs actual for one position. */
export type TradeReviewRow = {
  signal_id: number;
  symbol: string;
  verdict: string;
  why_grade: string | null;
  status: string;
  fill_date: string | null;
  fill_price: Num | null;
  stop_at_fill: Num | null;
  trim_price: Num | null;
  exit_date: string | null;
  exit_price: Num | null;
  exit_reason: string | null;
  realized_pnl: Num | null;
  r_multiple: Num | null;
  days_held: number | null;
  skill_stop: Num | null;
  mfe_pct: Num | null;
  mae_pct: Num | null;
  skill_stop_still_intact: boolean | null;
  post_exit_run_pct: Num | null;
  auto_tag: string | null;
  review_tag: string | null;
  review_lesson: string | null;
  review_author: string | null;
};

/** A row of trade_reviews, keyed by signal (it survives position removal). */
export type ReviewNote = {
  signal_id: number;
  symbol: string;
  tag: string;
  lesson: string | null;
  author: string;
  created_at: string;
};

export type LedgerEvent = {
  id: number;
  event_date: string;
  event_type: string;
  price: Num | null;
  qty: number | null;
  pnl: Num | null;
  rule: string | null;
};

export type PriceBar = {
  bar_date: string;
  open: Num;
  high: Num;
  low: Num;
  close: Num;
  volume: Num | null;
};

/** The ledger position for a signal, as read on the trade page. */
export type PositionLite = {
  status: string;
  fill_date: string | null;
  fill_price: Num | null;
  stop_current: Num | null;
  exit_date: string | null;
  exit_price: Num | null;
  exit_reason: string | null;
};

export type Trade = {
  plan: Plan;
  signal: {
    why_text: string | null;
    pivot: Num | null;
  };
  rationale: Rationale | null;
  checklist: ChecklistRow[];
  review: TradeReviewRow | null;
  note: ReviewNote | null;
  position: PositionLite | null;
  events: LedgerEvent[];
  exclusion: { batch: string | null; reason: string | null } | null;
  bars: PriceBar[];
};

export type SignalOutcome = {
  signal_id: number;
  symbol: string;
  signal_date: string;
  verdict: string;
  provisional: boolean;
  trigger_hit_date: string | null;
  ret_4w_pct: Num | null;
  max_up_4w_pct: Num | null;
  max_down_4w_pct: Num | null;
};

export type RuleEffect = {
  ord: number;
  rule: string;
  status: string;
  trades: number;
  winners: number;
  avg_r: Num | null;
  avg_return_pct: Num | null;
};

export type TradeStat = {
  dimension: string;
  verdict: string | null;
  why_grade: string | null;
  setup: string | null;
  skill_version: string | null;
  closed: number;
  open: number;
  not_filled: number;
  win_rate_pct: Num | null;
  avg_return_pct: Num | null;
  avg_r: Num | null;
  avg_days_held: Num | null;
  realized_pnl: Num | null;
};

export type Review = {
  reviews: TradeReviewRow[];
  notes: (ReviewNote & { signals: { verdict: string; signal_date: string } | null })[];
  positioned: Map<number, string>;
  excluded: Set<number>;
  outcomes: SignalOutcome[];
  rules: RuleEffect[];
  stats: TradeStat[];
};

export type RunRow = {
  run_id: number;
  run_type: string;
  data_as_of: string | null;
  started_at: string | null;
  skill_version: string | null;
  model: string | null;
  status: string;
  summary: string | null;
  verdicts: Record<string, number> | null;
  observations: string | null;
  lessons: string | null;
  proposed_change: string | null;
  proposal_status: string | null;
};

export type RunSignal = { signal_id: number; run_id: number; symbol: string; verdict: string };

export type Dashboard = {
  equity: EquityRow[];
  open: OpenPosition[];
  closed: ClosedTrade[];
  pending: PendingEntry[];
  processedThrough: string | null;
  bookRisk: BookRisk | null;
  ideas: Idea[];
};

// Row shapes for the dashboard's reads. PostgREST may return numeric columns as
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

/** The ledger's position for a signal, embedded one-to-one via positions.signal_id. */
export type PositionStatus = {
  status: string;
  exit_reason: string | null;
  fill_date: string | null;
  stop_at_fill: Num | null;
  trim_price: Num | null;
};

/** A non-provisional, non-superseded ENTRY / ENTRY_REDUCED signal from the current month. */
export type Suggestion = {
  id: number;
  symbol: string;
  signal_date: string;
  verdict: string;
  retro_seeded: boolean;
  why_grade: string | null;
  why_text: string | null;
  signal_close: Num | null;
  pivot: Num | null;
  entry_low: Num | null;
  entry_high: Num | null;
  stop: Num | null;
  trim_price: Num | null;
  size_pct: Num | null;
  vol_mult: Num | null;
  req_vol_mult: Num | null;
  sma13_rising: boolean | null;
  dist_sma_pct: Num | null;
  correction_pct: Num | null;
  base_range_pct: Num | null;
  close_loc: Num | null;
  liquidity_tier: string | null;
  window_start: string | null;
  window_end: string | null;
  positions: PositionStatus | null;
};

/** The latest WAIT_ALERT signal for a symbol in the current month. */
export type WatchAlert = {
  id: number;
  symbol: string;
  signal_date: string;
  retro_seeded: boolean;
  alert_trigger: Num | null;
  req_vol_abs: Num | null;
};

export type Dashboard = {
  equity: EquityRow[];
  open: OpenPosition[];
  closed: ClosedTrade[];
  pending: PendingEntry[];
  processedThrough: string | null;
  suggestions: Suggestion[];
  alerts: WatchAlert[];
  monthLabel: string;
};

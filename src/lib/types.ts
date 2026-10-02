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

export type Dashboard = {
  equity: EquityRow[];
  open: OpenPosition[];
  closed: ClosedTrade[];
  pending: PendingEntry[];
  processedThrough: string | null;
};

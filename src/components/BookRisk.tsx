import type { ReactNode } from "react";
import { day, inr, plainPct } from "@/lib/format";
import type { BookRisk as Row } from "@/lib/types";

/** The single v_book_risk row as stored, formatted only. */
export function BookRisk({ row }: { row: Row | null }) {
  return (
    <section aria-labelledby="book-risk" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2
        id="book-risk"
        className="mb-3 flex items-baseline justify-between gap-2 text-sm font-semibold uppercase tracking-wide text-muted"
      >
        Book risk
        {row && <span className="text-xs font-normal normal-case tracking-normal">as of {day(row.as_of)}</span>}
      </h2>
      {!row ? (
        <p className="text-sm text-muted">Book risk not available yet</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm tabular-nums sm:grid-cols-3 lg:grid-cols-6">
          <Item label="Equity">{inr(row.equity)}</Item>
          <Item label="Cash">
            {inr(row.cash)} <Sub>· {plainPct(row.cash_pct)}</Sub>
          </Item>
          <Item label="Open risk">
            {inr(row.open_risk_rupees)} <Sub>· {plainPct(row.open_risk_pct)}</Sub>
          </Item>
          <Item label="Pending committed">{inr(row.pending_committed_rupees)}</Item>
          <Item label="Cash after pending">{inr(row.cash_after_pending)}</Item>
          <Item label="Positions">
            {row.open_positions} / {row.max_open_positions}
          </Item>
        </dl>
      )}
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return <span className="font-normal text-muted">{children}</span>;
}

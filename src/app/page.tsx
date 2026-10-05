import type { ReactNode } from "react";
import { connection } from "next/server";
import { BookRisk } from "@/components/BookRisk";
import { DataList, type Column } from "@/components/DataList";
import { EquityCurve } from "@/components/EquityCurve";
import { Ideas } from "@/components/Ideas";
import { Empty, RetroBadge, Section, Signed, SymbolLink } from "@/components/ui";
import { asNumber, day, inr, pct, price, signedInr } from "@/lib/format";
import { getDashboard } from "@/lib/queries";
import type { ClosedTrade, OpenPosition, PendingEntry } from "@/lib/types";

// A position whose DB-reported distance to stop is at or below this is highlighted.
const NEAR_STOP_PCT = 3;

function isNearStop(p: OpenPosition): boolean {
  const dist = asNumber(p.dist_to_stop_pct);
  return dist !== null && dist <= NEAR_STOP_PCT;
}

const OPEN_COLUMNS: Column<OpenPosition>[] = [
  { label: "Symbol", cell: (p) => <Sym id={p.signal_id} symbol={p.symbol} retro={p.retro_seeded} /> },
  {
    label: "P&L %",
    primary: true,
    cell: (p) => <Signed value={p.unrealized_pct}>{pct(p.unrealized_pct)}</Signed>,
  },
  { label: "Stop", primary: true, cell: (p) => price(p.stop_current) },
  {
    label: "To stop",
    cell: (p) =>
      isNearStop(p) ? (
        <span className="font-semibold text-warn-fg">{pct(p.dist_to_stop_pct)} · near stop</span>
      ) : (
        pct(p.dist_to_stop_pct)
      ),
  },
  { label: "Filled", cell: (p) => day(p.fill_date) },
  { label: "Fill", cell: (p) => price(p.fill_price) },
  { label: "Last close", cell: (p) => price(p.last_close) },
];

const CLOSED_COLUMNS: Column<ClosedTrade>[] = [
  { label: "Symbol", cell: (t) => <Sym id={t.signal_id} symbol={t.symbol} retro={t.retro_seeded} /> },
  {
    label: "P&L",
    primary: true,
    cell: (t) => <Signed value={t.realized_pnl}>{signedInr(t.realized_pnl, 2)}</Signed>,
  },
  { label: "Reason", primary: true, cell: (t) => t.exit_reason ?? "—" },
  { label: "Entry", cell: (t) => day(t.fill_date) },
  { label: "Entry price", cell: (t) => price(t.fill_price) },
  { label: "Exit", cell: (t) => day(t.exit_date) },
  { label: "Exit price", cell: (t) => price(t.exit_price) },
];

const PENDING_COLUMNS: Column<PendingEntry>[] = [
  { label: "Symbol", cell: (e) => <Sym id={e.signal_id} symbol={e.symbol} retro={Boolean(e.signals?.retro_seeded)} /> },
  { label: "Stop", primary: true, cell: (e) => price(e.stop_initial) },
  { label: "Verdict", cell: (e) => e.signals?.verdict ?? "—" },
  {
    label: "Entry zone",
    cell: (e) => (
      <>
        {price(e.entry_low)} – {price(e.entry_high)}
      </>
    ),
  },
  {
    label: "Window",
    cell: (e) => (
      <>
        {day(e.window_start)} – {day(e.window_end)}
      </>
    ),
  },
];

export default async function Home({ searchParams }: PageProps<"/">) {
  await connection(); // render per request: data changes whenever a run processes the ledger
  const [{ equity, open, closed, pending, processedThrough, bookRisk, ideas }, query] = await Promise.all([
    getDashboard(),
    searchParams,
  ]);
  const latest = equity.at(-1);
  const tab = query.ideas === "watch" ? "watch" : "entry";

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:py-8">
      <header className="mb-2">
        <h1 className="text-2xl font-semibold tracking-tight">Paper P&amp;L</h1>
        <p className="text-sm text-muted">
          Breakout-with-volume paper book · Data through {day(processedThrough)}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Summary">
        <Tile label="Capital" value={inr(latest?.capital)} />
        <Tile label="Equity" value={inr(latest?.equity)} />
        <Tile
          label="Realised P&L"
          value={<Signed value={latest?.realized_cum ?? null}>{signedInr(latest?.realized_cum)}</Signed>}
        />
        <Tile
          label="Unrealised P&L"
          value={<Signed value={latest?.unrealized ?? null}>{signedInr(latest?.unrealized)}</Signed>}
        />
        <Tile
          label="Return"
          wide
          value={<Signed value={latest?.return_pct ?? null}>{pct(latest?.return_pct)}</Signed>}
        />
      </section>

      <BookRisk row={bookRisk} />

      <Ideas ideas={ideas} tab={tab} />

      <Section title="Equity curve">
        <EquityCurve rows={equity} />
      </Section>

      <Section title="Open positions" count={open.length}>
        {open.length === 0 ? (
          <Empty>No open positions</Empty>
        ) : (
          <DataList
            rows={open}
            columns={OPEN_COLUMNS}
            rowKey={(p) => p.signal_id}
            highlight={isNearStop}
          />
        )}
      </Section>

      <Section title="Closed trades" count={closed.length}>
        {closed.length === 0 ? (
          <Empty>No closed trades yet</Empty>
        ) : (
          <DataList rows={closed} columns={CLOSED_COLUMNS} rowKey={(t) => t.signal_id} />
        )}
      </Section>

      <Section title="Pending entries" count={pending.length}>
        {pending.length === 0 ? (
          <Empty>No pending entries</Empty>
        ) : (
          <DataList rows={pending} columns={PENDING_COLUMNS} rowKey={(e) => e.signal_id} />
        )}
      </Section>

      <footer className="pt-2 text-xs text-muted">
        Figures are computed by the tracker database; this page only displays them. Paper trading, not
        investment advice.
      </footer>
    </main>
  );
}

function Sym({ id, symbol, retro }: { id: number; symbol: string; retro: boolean }) {
  return (
    <>
      <SymbolLink id={id} symbol={symbol} />
      {retro && <RetroBadge />}
    </>
  );
}

function Tile({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-line bg-surface p-3 sm:p-4 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums sm:text-xl">{value}</div>
    </div>
  );
}

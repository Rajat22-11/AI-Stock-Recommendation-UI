import type { ReactNode } from "react";
import { connection } from "next/server";
import { EquityCurve } from "@/components/EquityCurve";
import { Suggestions } from "@/components/Suggestions";
import { Empty, RetroBadge, Section, Signed, Table, Td } from "@/components/ui";
import { asNumber, day, inr, pct, price, signedInr } from "@/lib/format";
import { getDashboard } from "@/lib/queries";

// A position whose DB-reported distance to stop is at or below this is highlighted.
const NEAR_STOP_PCT = 3;

export default async function Home() {
  await connection(); // render per request: data changes whenever a run processes the ledger
  const { equity, open, closed, pending, processedThrough, suggestions, alerts, monthLabel } =
    await getDashboard();
  const latest = equity.at(-1);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:py-10">
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

      <Suggestions suggestions={suggestions} alerts={alerts} monthLabel={monthLabel} />

      <Section title="Equity curve">
        <EquityCurve rows={equity} />
      </Section>

      <Section title="Open positions" count={open.length}>
        {open.length === 0 ? (
          <Empty>No open positions</Empty>
        ) : (
          <Table head={["Symbol", "Filled", "Fill", "Last close", "P&L %", "Stop", "To stop"]}>
            {open.map((p) => {
              const dist = asNumber(p.dist_to_stop_pct);
              const near = dist !== null && dist <= NEAR_STOP_PCT;
              return (
                <tr
                  key={p.signal_id}
                  className={`border-b border-line last:border-0 ${near ? "bg-warn-bg" : ""}`}
                >
                  <Td left>
                    <span className="font-medium">{p.symbol}</span>
                    {p.retro_seeded && <RetroBadge />}
                  </Td>
                  <Td>{day(p.fill_date)}</Td>
                  <Td>{price(p.fill_price)}</Td>
                  <Td>{price(p.last_close)}</Td>
                  <Td>
                    <Signed value={p.unrealized_pct}>{pct(p.unrealized_pct)}</Signed>
                  </Td>
                  <Td>{price(p.stop_current)}</Td>
                  <Td>
                    {near ? (
                      <span className="font-semibold text-warn-fg">{pct(p.dist_to_stop_pct)} · near stop</span>
                    ) : (
                      pct(p.dist_to_stop_pct)
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Section>

      <Section title="Closed trades" count={closed.length}>
        {closed.length === 0 ? (
          <Empty>No closed trades yet</Empty>
        ) : (
          <Table head={["Symbol", "Entry", "Entry price", "Exit", "Exit price", "Reason", "P&L"]}>
            {closed.map((t) => (
              <tr key={t.signal_id} className="border-b border-line last:border-0">
                <Td left>
                  <span className="font-medium">{t.symbol}</span>
                  {t.retro_seeded && <RetroBadge />}
                </Td>
                <Td>{day(t.fill_date)}</Td>
                <Td>{price(t.fill_price)}</Td>
                <Td>{day(t.exit_date)}</Td>
                <Td>{price(t.exit_price)}</Td>
                <Td>{t.exit_reason ?? "—"}</Td>
                <Td>
                  <Signed value={t.realized_pnl}>{signedInr(t.realized_pnl, 2)}</Signed>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Pending entries" count={pending.length}>
        {pending.length === 0 ? (
          <Empty>No pending entries</Empty>
        ) : (
          <Table head={["Symbol", "Verdict", "Entry zone", "Window", "Stop"]}>
            {pending.map((e) => (
              <tr key={e.signal_id} className="border-b border-line last:border-0">
                <Td left>
                  <span className="font-medium">{e.symbol}</span>
                  {e.signals?.retro_seeded && <RetroBadge />}
                </Td>
                <Td>{e.signals?.verdict ?? "—"}</Td>
                <Td>
                  {price(e.entry_low)} – {price(e.entry_high)}
                </Td>
                <Td>
                  {day(e.window_start)} – {day(e.window_end)}
                </Td>
                <Td>{price(e.stop_initial)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <footer className="pt-2 text-xs text-muted">
        Figures are computed by the tracker database; this page only displays them. Paper trading, not
        investment advice.
      </footer>
    </main>
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

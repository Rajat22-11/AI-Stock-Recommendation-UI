import type { Metadata } from "next";
import { connection } from "next/server";
import type { CSSProperties } from "react";
import { DataList, type Column } from "@/components/DataList";
import { Empty, InfoTip, Marker, Section, Signed, SymbolLink, TagChip } from "@/components/ui";
import { day, pct, plainPct, rMult, signedInr } from "@/lib/format";
import { getReview } from "@/lib/queries";
import { AVOIDED_RET_PCT, bucket, isUnresolved, MISSED_UP_PCT, statusLabel, toneOf, type Reviewed } from "@/lib/review";
import type { RuleEffect, SignalOutcome, TradeStat } from "@/lib/types";

export const metadata: Metadata = { title: "Review · Paper P&L" };

/** Below this many closed trades the stats carry a warning. */
const MEANINGFUL_CLOSED = 30;
/** Heatmap cells with fewer trades than this are muted and not colour-scaled. */
const MIN_CELL_TRADES = 3;
const STATUSES = ["pass", "weak", "fail", "n/a"];

const DIMENSIONS: { key: keyof TradeStat & string; dim: string; title: string }[] = [
  { key: "why_grade", dim: "why_grade", title: "By why-grade" },
  { key: "setup", dim: "setup", title: "By setup" },
  { key: "skill_version", dim: "skill_version", title: "By skill version" },
  { key: "verdict", dim: "verdict", title: "By verdict" },
];

export default async function ReviewPage() {
  await connection(); // render per request: reviews change with every run
  const data = await getReview();
  const buckets = bucket(data);
  const overall = data.stats.find((s) => s.dimension === "overall");
  const closed = overall ? Number(overall.closed) : 0;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:py-8">
      <header className="mb-1">
        <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        <p className="text-sm text-muted">How the agent&apos;s calls turned out, from its reviews and the ledger.</p>
      </header>

      {closed < MEANINGFUL_CLOSED && (
        <p role="status" className="rounded-xl border border-line bg-warn-bg px-4 py-3 text-sm text-warn-fg">
          <span className="font-semibold">Fewer than {MEANINGFUL_CLOSED} closed trades — not statistically meaningful.</span>{" "}
          {closed} closed {closed === 1 ? "trade" : "trades"} so far.
        </p>
      )}

      <Section title="Went right" count={buckets.right.length}>
        {buckets.right.length === 0 ? <Empty>Nothing has gone right yet</Empty> : <ReviewList items={buckets.right} />}
      </Section>

      <Section title="Went wrong" count={buckets.wrong.length}>
        {buckets.wrong.length === 0 ? <Empty>Nothing has gone wrong yet</Empty> : <ReviewList items={buckets.wrong} />}
      </Section>

      <Section title="Missed / avoided" count={buckets.missed.length}>
        <p className="-mt-1 mb-3 text-xs text-muted">
          Tagged missed_runner / avoided_loser, plus never-taken signals that triggered and ran {MISSED_UP_PCT}%+ within 4
          weeks (missed) or fell {Math.abs(AVOIDED_RET_PCT)}%+ over 4 weeks (avoided).
        </p>
        {buckets.missed.length === 0 ? (
          <Empty>Not enough price history to judge missed or avoided calls yet</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {buckets.missed.map((m, k) =>
              m.review ? (
                <ReviewItem key={`r${k}`} r={m.review} kind={m.kind} />
              ) : (
                <OutcomeItem key={`o${k}`} o={m.outcome!} kind={m.kind} />
              ),
            )}
          </ul>
        )}
      </Section>

      {buckets.other.length > 0 && (
        <details className="rounded-xl border border-line bg-surface">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold uppercase tracking-wide text-muted sm:px-5">
            Other notes <span className="ml-1 rounded-full bg-chip px-2 py-0.5 text-xs normal-case">{buckets.other.length}</span>
          </summary>
          <div className="px-4 pb-4 sm:px-5">
            <ReviewList items={buckets.other} />
          </div>
        </details>
      )}

      <Section title="Rule effectiveness">
        <Heatmap rules={data.rules} />
      </Section>

      <Section title="Stats">
        {overall && (
          <p className="mb-4 text-sm tabular-nums">
            <span className="font-medium">Overall:</span> {overall.closed} closed · {overall.open} open · {overall.not_filled}{" "}
            not filled · win rate {plainPct(overall.win_rate_pct)} · avg R {rMult(overall.avg_r)} · realised{" "}
            <Signed value={overall.realized_pnl}>{signedInr(overall.realized_pnl)}</Signed>
          </p>
        )}
        <div className="space-y-6">
          {DIMENSIONS.map((d) => {
            const rows = data.stats.filter((s) => s.dimension === d.dim);
            return (
              <div key={d.dim}>
                <h3 className="mb-2 text-sm font-medium">{d.title}</h3>
                {rows.length === 0 ? (
                  <Empty>No rows</Empty>
                ) : (
                  <DataList rows={rows} columns={statColumns(d.key)} rowKey={(r) => String(r[d.key] ?? "unspecified")} />
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </main>
  );
}

function ReviewList({ items }: { items: Reviewed[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((r) => (
        <ReviewItem key={r.signalId} r={r} />
      ))}
    </ul>
  );
}

function ReviewItem({ r, kind }: { r: Reviewed; kind?: "missed" | "avoided" }) {
  return (
    <li className="py-3 text-sm first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <SymbolLink id={r.signalId} symbol={r.symbol} />
        {r.verdict && <span className="text-xs text-muted">{r.verdict}</span>}
        {kind && <Marker>{kind}</Marker>}
        {r.tag && <TagChip tag={r.tag} tone={toneOf(r.tag)} />}
        {r.autoTag && r.reviewTag && r.autoTag !== r.reviewTag && (
          <TagChip prefix="Auto" tag={r.autoTag} tone={toneOf(r.autoTag)} />
        )}
        <span className="text-xs text-muted">{statusLabel(r.status)}</span>
        {isUnresolved(r.status) && <Marker warn>unresolved</Marker>}
        {r.pilot && <Marker>pilot</Marker>}
        {r.rMultiple !== null && (
          <span className="ml-auto text-xs tabular-nums">
            <Signed value={r.rMultiple}>{rMult(r.rMultiple)}</Signed>
            {r.realizedPnl !== null && (
              <>
                {" "}· <Signed value={r.realizedPnl}>{signedInr(r.realizedPnl, 2)}</Signed>
              </>
            )}
          </span>
        )}
      </div>
      {r.lesson && <p className="mt-1 whitespace-pre-line">{r.lesson}</p>}
      <p className="mt-0.5 text-xs text-muted">
        {day(r.date)}
        {r.author && <> · {r.author}</>}
      </p>
    </li>
  );
}

function OutcomeItem({ o, kind }: { o: SignalOutcome; kind: "missed" | "avoided" }) {
  return (
    <li className="py-3 text-sm first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <SymbolLink id={o.signal_id} symbol={o.symbol} />
        <span className="text-xs text-muted">{o.verdict}</span>
        <Marker warn={kind === "missed"}>{kind}</Marker>
        <span className="ml-auto text-xs tabular-nums">
          {kind === "missed" ? (
            <>
              <Signed value={o.max_up_4w_pct}>{pct(o.max_up_4w_pct)}</Signed> max in 4w · triggered {day(o.trigger_hit_date)}
            </>
          ) : (
            <>
              <Signed value={o.ret_4w_pct}>{pct(o.ret_4w_pct)}</Signed> over 4w
            </>
          )}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted">Signal {day(o.signal_date)} · no position</p>
    </li>
  );
}

function Heatmap({ rules }: { rules: RuleEffect[] }) {
  if (rules.length === 0) return <Empty>No closed trades to score rules yet</Empty>;

  const names = [...new Map(rules.map((r) => [r.ord, r.rule])).entries()].sort((a, b) => a[0] - b[0]);
  const cell = new Map(rules.map((r) => [`${r.ord}|${r.status}`, r]));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-1 text-xs tabular-nums">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="text-left font-medium">
                Rule
              </th>
              {STATUSES.map((s) => (
                <th key={s} scope="col" className="w-[15%] font-medium">
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map(([ord, rule]) => (
              <tr key={ord}>
                <th scope="row" className="pr-2 text-left font-normal">
                  {rule}
                </th>
                {STATUSES.map((s) => {
                  const c = cell.get(`${ord}|${s}`);
                  return (
                    <td key={s} className="rounded-md px-2 py-2 text-center" style={heat(c)}>
                      {c ? (
                        <>
                          <span className="font-semibold">{rMult(c.avg_r)}</span>
                          <span className="block text-[10px] opacity-80">
                            {c.trades} {c.trades === 1 ? "trade" : "trades"}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InfoTip id="heatmap-legend" label="How to read this" className="bg-chip text-muted">
        {`Each cell is the average R of closed trades whose checklist had that rule at that status, with the trade count. Green is above 0 R and red below; stronger colour means further from 0, up to ±2 R. Cells with fewer than ${MIN_CELL_TRADES} trades are grey.`}
      </InfoTip>
    </div>
  );
}

/** Diverging fill around 0 R, in 4 steps capped at ±2 R; small cells stay neutral. */
function heat(c: RuleEffect | undefined): CSSProperties {
  if (!c || Number(c.trades) < MIN_CELL_TRADES || c.avg_r === null) {
    return { background: "var(--chip)", color: "var(--muted)" };
  }
  const r = Number(c.avg_r);
  const step = Math.min(4, Math.ceil((Math.min(Math.abs(r), 2) / 2) * 4));
  if (step === 0) return { background: "var(--chip)" };
  return { background: `color-mix(in oklab, var(${r > 0 ? "--gain" : "--loss"}) ${step * 12}%, var(--surface))` };
}

function statColumns(key: keyof TradeStat & string): Column<TradeStat>[] {
  return [
    { label: "Group", cell: (s) => <span className="font-medium">{(s[key] as string | null) ?? "unspecified"}</span> },
    { label: "Avg R", primary: true, cell: (s) => <Signed value={s.avg_r}>{rMult(s.avg_r)}</Signed> },
    { label: "Closed", primary: true, cell: (s) => s.closed },
    { label: "Open", cell: (s) => s.open },
    { label: "Not filled", cell: (s) => s.not_filled },
    { label: "Win rate", cell: (s) => plainPct(s.win_rate_pct) },
    { label: "Avg return", cell: (s) => <Signed value={s.avg_return_pct}>{pct(s.avg_return_pct)}</Signed> },
    { label: "Avg days", cell: (s) => (s.avg_days_held === null ? "—" : String(s.avg_days_held)) },
    { label: "Realised", cell: (s) => <Signed value={s.realized_pnl}>{signedInr(s.realized_pnl)}</Signed> },
  ];
}

import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { Empty, Marker, VerdictDot, verdictBg, verdictRank } from "@/components/ui";
import { day, istTime } from "@/lib/format";
import { getRuns } from "@/lib/queries";
import type { RunRow, RunSignal } from "@/lib/types";

export const metadata: Metadata = { title: "Runs · Paper P&L" };

/** Signal chips shown before the rest collapse behind "Show all N". */
const VISIBLE_SIGNALS = 12;
/** Notes longer than this collapse behind an expander. */
const LONG_TEXT = 280;

const byVerdict = (a: string, b: string) => verdictRank(a) - verdictRank(b) || a.localeCompare(b);

export default async function RunsPage() {
  await connection(); // render per request: a new run can land at any time
  const { runs, signals } = await getRuns();

  const byRun = new Map<number, RunSignal[]>();
  for (const s of signals) {
    const list = byRun.get(s.run_id) ?? [];
    list.push(s);
    byRun.set(s.run_id, list);
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:py-8">
      <header className="mb-1">
        <h1 className="text-2xl font-semibold tracking-tight">Runs</h1>
        <p className="text-sm text-muted">Every agent run, newest first, with what it decided and what it learned.</p>
      </header>
      {runs.length === 0 ? (
        <Empty>No runs recorded yet</Empty>
      ) : (
        runs.map((run) => <RunCard key={run.run_id} run={run} signals={byRun.get(run.run_id) ?? []} />)
      )}
    </main>
  );
}

function RunCard({ run, signals }: { run: RunRow; signals: RunSignal[] }) {
  const mix = Object.entries(run.verdicts ?? {})
    .filter(([, n]) => Number(n) > 0)
    .sort(([a], [b]) => byVerdict(a, b));
  const total = mix.reduce((t, [, n]) => t + Number(n), 0);
  const sorted = [...signals].sort((a, b) => byVerdict(a.verdict, b.verdict) || a.symbol.localeCompare(b.symbol));

  return (
    <article id={`run-${run.run_id}`} className="scroll-mt-4 rounded-xl border border-line bg-surface p-4 target:ring-2 target:ring-muted sm:p-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-semibold">
          Run {run.run_id} · {run.run_type}
        </h2>
        {run.status !== "succeeded" && <Marker warn>{run.status}</Marker>}
        <span className="text-sm text-muted">Data as of {day(run.data_as_of)}</span>
      </header>
      <p className="mt-0.5 text-xs text-muted">
        Started {istTime(run.started_at)}
        {run.skill_version && <> · Skill {run.skill_version}</>}
        {run.model && <> · {run.model}</>}
      </p>

      {run.summary && <p className="mt-3 text-sm">{run.summary}</p>}

      <div className="mt-4">
        <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Verdict mix</h3>
        {total === 0 ? (
          <p className="text-sm text-muted">No verdicts</p>
        ) : (
          <>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
              {mix.map(([v, n]) => (
                <span key={v} className={verdictBg(v)} style={{ flexGrow: Number(n) }} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label={`Verdict mix, ${total} signals`}>
              {mix.map(([v, n]) => (
                <li key={v} className="flex items-center gap-1.5">
                  <VerdictDot verdict={v} />
                  {v} <span className="font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <Note heading="Observations" text={run.observations} />
        <Note heading="Lessons" text={run.lessons} />
        <Note
          heading="Proposed change"
          text={run.proposed_change}
          badge={run.proposal_status ? <Marker>{run.proposal_status}</Marker> : null}
        />
      </div>

      {sorted.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Signals ({sorted.length})</h3>
          <Chips signals={sorted.slice(0, VISIBLE_SIGNALS)} />
          {sorted.length > VISIBLE_SIGNALS && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted">Show all {sorted.length}</summary>
              <div className="mt-2">
                <Chips signals={sorted.slice(VISIBLE_SIGNALS)} />
              </div>
            </details>
          )}
        </div>
      )}
    </article>
  );
}

function Chips({ signals }: { signals: RunSignal[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {signals.map((s) => (
        <li key={s.signal_id}>
          <Link
            href={`/trade/${s.signal_id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs hover:bg-chip"
          >
            <VerdictDot verdict={s.verdict} />
            <span className="font-medium">{s.symbol}</span>
            <span className="text-muted">{s.verdict}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Note({ heading, text, badge }: { heading: string; text: string | null; badge?: ReactNode }) {
  if (!text) return null;
  const title = (
    <span className="text-xs font-semibold uppercase tracking-wide text-muted">
      {heading}
      {badge}
    </span>
  );
  if (text.length <= LONG_TEXT) {
    return (
      <div>
        {title}
        <p className="mt-0.5 whitespace-pre-line text-sm">{text}</p>
      </div>
    );
  }
  return (
    <details>
      <summary className="cursor-pointer">
        {title}
        <span className="text-sm text-muted"> — {text.slice(0, 140).trimEnd()}…</span>
      </summary>
      <p className="mt-1 whitespace-pre-line text-sm">{text}</p>
    </details>
  );
}

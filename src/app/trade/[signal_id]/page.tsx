import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CandleChart, type Level, type Marker } from "@/components/CandleChart";
import { DataList, type Column } from "@/components/DataList";
import {
  CountChips,
  Empty,
  Field,
  Prose,
  RetroBadge,
  Section,
  Signed,
  StatusChip,
  SubLabel,
  TagChip,
  WhyGrade,
} from "@/components/ui";
import {
  asNumber,
  confidence,
  count,
  day,
  inr,
  na,
  pct,
  plainPct,
  price,
  rMult,
  rr,
  signedInr,
} from "@/lib/format";
import { getTrade } from "@/lib/queries";
import { toneOf } from "@/lib/review";
import type { ChecklistRow, LedgerEvent, Trade } from "@/lib/types";
import { toWeekly, weekEnding } from "@/lib/weekly";

function parseId(raw: string): number | null {
  return /^[1-9]\d{0,17}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: PageProps<"/trade/[signal_id]">): Promise<Metadata> {
  await connection();
  const id = parseId((await params).signal_id);
  const trade = id === null ? null : await getTrade(id);
  return { title: trade ? `${trade.plan.symbol} · Paper P&L` : "Signal not found · Paper P&L" };
}

export default async function TradePage({ params }: PageProps<"/trade/[signal_id]">) {
  await connection(); // render per request: reviews, events and bars change with every run
  const id = parseId((await params).signal_id);
  if (id === null) notFound();
  const trade = await getTrade(id);
  if (!trade) notFound();

  const { plan } = trade;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:py-8">
      <Header trade={trade} />
      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard trade={trade} />
        <OutcomeCard trade={trade} />
      </div>
      <Section title="Weekly chart">
        <CandleChart candles={toWeekly(trade.bars)} levels={levelsOf(trade)} markers={markersOf(trade)} />
      </Section>
      <ReasoningCard trade={trade} />
      <Section title="Checklist" count={trade.checklist.length}>
        {trade.checklist.length === 0 ? (
          <Empty>No checklist recorded</Empty>
        ) : (
          <DataList rows={trade.checklist} columns={CHECKLIST_COLUMNS} rowKey={(r) => r.ord} />
        )}
      </Section>
      <Section title="Events">
        <Timeline events={trade.events} />
      </Section>
      <p className="text-xs text-muted">
        Signal #{plan.signal_id}. Figures come from the tracker database; weekly candles are grouped from daily bars.
        Paper trading, not investment advice.
      </p>
    </main>
  );
}

function Header({ trade }: { trade: Trade }) {
  const { plan, exclusion } = trade;
  return (
    <header className="space-y-2">
      <p className="text-xs text-muted">
        <Link href="/" className="underline underline-offset-4">
          Home
        </Link>{" "}
        / Signal
      </p>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{plan.symbol}</h1>
        {plan.retro_seeded && <RetroBadge />}
        <span className="font-medium">{plan.verdict}</span>
        <WhyGrade grade={plan.why_grade} />
      </div>
      <p className="text-sm text-muted">
        Signal {day(plan.signal_date)}
        {plan.setup && <> · Setup {plan.setup}</>}
        {plan.stage !== null && <> · Stage {plan.stage}</>}
        {plan.skill_version && <> · Skill {plan.skill_version}</>}
        {plan.run_id !== null && (
          <>
            {" "}·{" "}
            <Link href={`/runs#run-${plan.run_id}`} className="underline underline-offset-4">
              Run {plan.run_id}
            </Link>
          </>
        )}
      </p>
      {exclusion && (
        <p className="rounded-lg border border-line bg-warn-bg px-3 py-2 text-sm text-warn-fg">
          <span className="font-semibold">Excluded from analysis</span>
          {exclusion.batch && <> · {exclusion.batch}</>}
          {exclusion.reason && <> · {exclusion.reason}</>}
        </p>
      )}
    </header>
  );
}

function PlanCard({ trade: { plan } }: { trade: Trade }) {
  return (
    <Section title="Plan">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <Field label="Entry zone">
          {price(plan.entry_ref)} – {price(plan.entry_high)}
        </Field>
        <Field label="Stop">
          {na(price(plan.stop_ref))}
          <SubLabel>risk {na(plainPct(plan.risk_pct_plan))}</SubLabel>
        </Field>
        <Field label="Trim">
          {na(price(plan.trim_ref))}
          <SubLabel>reward {na(plainPct(plan.reward_pct_plan))}</SubLabel>
        </Field>
        <Field label="R:R">{rr(plan.rr_plan)}</Field>
        <Field label="Size">
          {na(plainPct(plan.size_pct))}
          <SubLabel>{na(inr(plan.position_value))}</SubLabel>
        </Field>
        <Field label="Capital at risk">{na(plainPct(plan.capital_risk_pct))}</Field>
        <Field label="₹ risk">{na(inr(plan.rupee_risk))}</Field>
        <Field label="₹ at trim">{na(inr(plan.rupee_reward_at_trim))}</Field>
        <Field label="Book">
          {plan.book_status ?? "not in book"}
          {plan.book_reason && <SubLabel>{plan.book_reason}</SubLabel>}
        </Field>
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CountChips passes={plan.passes} weak={plan.weak} fails={plan.fails} />
        {plan.failed_rules && <span className="text-xs text-loss">Failed: {plan.failed_rules}</span>}
      </div>
    </Section>
  );
}

function OutcomeCard({ trade }: { trade: Trade }) {
  const { review: r, note, position } = trade;

  if (!r) {
    return (
      <Section title="Outcome">
        {note ? (
          <>
            {!position && <p className="mb-3 text-sm text-muted">No paper position for this signal</p>}
            <Lesson tag={note.tag} lesson={note.lesson} author={note.author} />
          </>
        ) : position ? (
          <Empty>Position {position.status}; not reviewed yet</Empty>
        ) : (
          <Empty>No outcome yet</Empty>
        )}
      </Section>
    );
  }

  const intact = r.skill_stop_still_intact;
  const sameStop = asNumber(r.skill_stop) !== null && asNumber(r.skill_stop) === asNumber(r.stop_at_fill);
  return (
    <Section title="Outcome">
      <div className="mb-3 flex flex-wrap gap-2">
        {r.auto_tag && <TagChip prefix="Auto" tag={r.auto_tag} tone={toneOf(r.auto_tag)} />}
        {r.review_tag && <TagChip prefix="Review" tag={r.review_tag} tone={toneOf(r.review_tag)} />}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <Field label="Status">{r.status}</Field>
        <Field label="Fill">
          {price(r.fill_price)}
          <SubLabel>{day(r.fill_date)}</SubLabel>
        </Field>
        <Field label="Exit">
          {price(r.exit_price)}
          <SubLabel>
            {day(r.exit_date)}
            {r.exit_reason && ` · ${r.exit_reason}`}
          </SubLabel>
        </Field>
        <Field label="Realised P&L">
          <Signed value={r.realized_pnl}>{signedInr(r.realized_pnl, 2)}</Signed>
        </Field>
        <Field label="R multiple">
          <Signed value={r.r_multiple}>{rMult(r.r_multiple)}</Signed>
        </Field>
        <Field label="Days held">{r.days_held ?? "—"}</Field>
        <Field label="MFE">
          <Signed value={r.mfe_pct}>{pct(r.mfe_pct)}</Signed>
        </Field>
        <Field label="MAE">
          <Signed value={r.mae_pct}>{pct(r.mae_pct)}</Signed>
        </Field>
        {r.status === "closed" && (
          <Field label="Run after exit">
            <Signed value={r.post_exit_run_pct}>{pct(r.post_exit_run_pct)}</Signed>
          </Field>
        )}
      </dl>
      {r.skill_stop !== null && (
        <p className="mt-3 rounded-md bg-chip px-3 py-2 text-sm">
          Ledger stop {price(r.stop_at_fill)} · Skill stop {price(r.skill_stop)} (fill × 0.92) —{" "}
          {intact === null ? (
            "no bars since fill"
          ) : intact ? (
            <span className="text-gain">still intact</span>
          ) : (
            <span className="text-loss">would have been hit</span>
          )}
          {sameStop && <span className="text-muted"> (same level)</span>}
        </p>
      )}
      {r.review_tag && (
        <div className="mt-3">
          <Lesson lesson={r.review_lesson} author={r.review_author} />
        </div>
      )}
    </Section>
  );
}

function Lesson({ tag, lesson, author }: { tag?: string; lesson: string | null; author: string | null }) {
  return (
    <div className="space-y-1 text-sm">
      {tag && <TagChip prefix="Review" tag={tag} tone={toneOf(tag)} />}
      {lesson && <p className="whitespace-pre-line">{lesson}</p>}
      {author && <p className="text-xs text-muted">— {author}</p>}
    </div>
  );
}

function ReasoningCard({ trade }: { trade: Trade }) {
  const r = trade.rationale;
  return (
    <Section title="Reasoning">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <WhyGrade grade={trade.plan.why_grade} />
        {r && <span className="text-muted">Confidence {confidence(r.confidence)}</span>}
      </div>
      {trade.signal.why_text && <p className="mb-3 text-sm">{trade.signal.why_text}</p>}
      {r ? (
        <Prose
          items={[
            ["Thesis", r.thesis],
            ["Catalyst", r.catalyst],
            ["Risks", r.risks],
            ["Invalidation", r.invalidation],
            ["Alternatives considered", r.alternatives],
            ["Data gaps", r.data_gaps],
          ]}
        />
      ) : (
        <Empty>No written rationale for this signal</Empty>
      )}
    </Section>
  );
}

const CHECKLIST_COLUMNS: Column<ChecklistRow>[] = [
  { label: "Rule", cell: (c) => <span className="font-medium">{c.rule}</span> },
  { label: "Status", primary: true, cell: (c) => <StatusChip status={c.status} /> },
  { label: "Measured", cell: (c) => c.measured ?? "n/a" },
  { label: "Target", align: "left", cell: (c) => <span className="text-muted">{c.target ?? "n/a"}</span> },
];

function Timeline({ events }: { events: LedgerEvent[] }) {
  if (events.length === 0) return <Empty>No ledger events</Empty>;
  return (
    <ol className="relative space-y-3 border-l border-line pl-4 text-sm">
      {events.map((e) => (
        <li key={e.id}>
          <span aria-hidden className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-muted" />
          <div className="tabular-nums">
            <span className="font-medium">{day(e.event_date)}</span> · {e.event_type}
            {e.price !== null && (
              <>
                {" "}· {price(e.price)}
                {e.qty !== null && <> × {count(e.qty)}</>}
              </>
            )}
            {e.pnl !== null && (
              <>
                {" "}· <Signed value={e.pnl}>{signedInr(e.pnl, 2)}</Signed>
              </>
            )}
          </div>
          {e.rule && <p className="text-xs text-muted">{e.rule}</p>}
        </li>
      ))}
    </ol>
  );
}

// ---------- chart inputs (stored values only) ----------

function levelsOf(t: Trade): Level[] {
  const out: Level[] = [];
  const add = (key: string, label: string, v: unknown, tone: Level["tone"], dashed?: boolean) => {
    const n = asNumber(v as string | number | null);
    if (n !== null) out.push({ key, label, value: n, tone, dashed });
  };
  add("pivot", "Pivot", t.signal.pivot, "muted", true);
  add("entry", "Entry", t.plan.entry_ref, "fg");
  add("stop", "Stop", t.plan.stop_ref, "loss", true);
  add("trim", "Trim", t.plan.trim_ref, "gain", true);
  const cur = asNumber(t.position?.stop_current ?? null);
  if (cur !== null && cur !== asNumber(t.plan.stop_ref)) add("stop_current", "Current stop", cur, "warn");
  return out;
}

const EVENT_MARKER: Record<string, Marker["kind"]> = {
  fill: "fill",
  trim: "trim",
  stop_hit: "exit",
  exit: "exit",
};

function markersOf(t: Trade): Marker[] {
  const fromEvents: Marker[] = [];
  for (const e of t.events) {
    const kind = EVENT_MARKER[e.event_type];
    const p = asNumber(e.price);
    if (kind && p !== null) {
      fromEvents.push({ kind, price: p, weekEnd: weekEnding(e.event_date), label: `${e.event_type} ${day(e.event_date)}` });
    }
  }
  const pos = t.position;
  const has = (k: Marker["kind"]) => fromEvents.some((m) => m.kind === k);
  const fill = asNumber(pos?.fill_price ?? null);
  if (pos?.fill_date && fill !== null && !has("fill")) {
    fromEvents.push({ kind: "fill", price: fill, weekEnd: weekEnding(pos.fill_date), label: `fill ${day(pos.fill_date)}` });
  }
  const exit = asNumber(pos?.exit_price ?? null);
  if (pos?.exit_date && exit !== null && !has("exit")) {
    fromEvents.push({
      kind: "exit",
      price: exit,
      weekEnd: weekEnding(pos.exit_date),
      label: `${pos.exit_reason ?? "exit"} ${day(pos.exit_date)}`,
    });
  }
  return fromEvents;
}


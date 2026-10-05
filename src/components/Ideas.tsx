import Link from "next/link";
import { CountChips, Field, InfoTip, Prose, RetroBadge, SubLabel, WhyGrade } from "@/components/ui";
import { confidence, count, day, inr, na, plainPct, price, rr } from "@/lib/format";
import type { Idea } from "@/lib/types";

export type IdeasTab = "entry" | "watch";

const TABS: { id: IdeasTab; label: string; empty: string }[] = [
  { id: "entry", label: "Entry", empty: "No entry ideas right now" },
  { id: "watch", label: "Watch", empty: "Nothing on the watch list" },
];

/** v_suggestions as stored and in the view's order; the page only splits it by bucket. */
export function Ideas({ ideas, tab }: { ideas: Idea[]; tab: IdeasTab }) {
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const shown = ideas.filter((i) => i.bucket === current.id);

  return (
    <section id="ideas" aria-labelledby="ideas-title" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 id="ideas-title" className="text-sm font-semibold uppercase tracking-wide text-muted">
        Current ideas
      </h2>
      <p className="mb-3 mt-0.5 text-xs text-muted">Latest idea per symbol over the last 31 days</p>

      <nav aria-label="Idea lists" className="mb-4 flex gap-1 border-b border-line">
        {TABS.map((t) => {
          const n = ideas.filter((i) => i.bucket === t.id).length;
          const active = t.id === current.id;
          return (
            <Link
              key={t.id}
              href={t.id === "entry" ? "/#ideas" : "/?ideas=watch#ideas"}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${active ? "border-foreground font-medium" : "border-transparent text-muted hover:text-foreground"}`}
            >
              {t.label} <span className="ml-1 rounded-full bg-chip px-2 py-0.5 text-xs">{n}</span>
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <p className="py-2 text-sm text-muted">{current.empty}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((idea) => (
            <IdeaCard key={idea.signal_id} idea={idea} />
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted">Paper-trading ideas, not investment advice.</p>
    </section>
  );
}

function IdeaCard({ idea: i }: { idea: Idea }) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-line p-3 text-sm sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            href={`/trade/${i.signal_id}`}
            className="text-base font-semibold underline decoration-line underline-offset-4 hover:decoration-current"
          >
            {i.symbol}
          </Link>
          {i.retro_seeded && <RetroBadge />}
          <div className="text-xs text-muted">{day(i.signal_date)}</div>
        </div>
        <div className="text-right">
          <div className="font-medium">{i.verdict}</div>
          {i.verdict === "ENTRY_REDUCED" && <SubLabel>half size</SubLabel>}
        </div>
      </div>

      {i.fundable_now === false && (
        <div>
          <InfoTip id={`unfundable-${i.signal_id}`} label="Not fundable in paper book" className="bg-warn-bg text-warn-fg">
            {`Planned position ${inr(i.position_value)} is more than the paper book's cash ${inr(i.book_cash)}.`}
          </InfoTip>
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <Field label="Entry zone">
          {price(i.entry_ref)} – {price(i.entry_high)}
        </Field>
        <Field label="Stop">{na(price(i.stop_ref))}</Field>
        <Field label="Trim">{na(price(i.trim_ref))}</Field>
        <Field label="R:R">{rr(i.rr_plan)}</Field>
        <Field label="₹ risk">{na(inr(i.rupee_risk))}</Field>
        <Field label="₹ at trim">{na(inr(i.rupee_reward_at_trim))}</Field>
        <Field label="Size">{na(plainPct(i.size_pct))}</Field>
        <Field label="Confidence">{confidence(i.confidence)}</Field>
        <Field label="Book">
          {i.book_status ?? "n/a"}
          {i.book_reason && <SubLabel>{i.book_reason}</SubLabel>}
        </Field>
        {i.bucket === "watch" && i.alert_trigger !== null && <Field label="Trigger">{price(i.alert_trigger)}</Field>}
        {i.bucket === "watch" && i.req_vol_abs !== null && <Field label="Required volume">{count(i.req_vol_abs)}</Field>}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <CountChips passes={i.passes} weak={i.weak} fails={i.fails} />
        {i.failed_rules && <span className="text-xs text-loss">Failed: {i.failed_rules}</span>}
      </div>

      <details className="group rounded-md border border-line">
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-medium">
          Why <WhyGrade grade={i.why_grade} />
        </summary>
        <div className="space-y-3 px-3 pb-3">
          {i.why_text && <p className="text-sm">{i.why_text}</p>}
          <Why idea={i} />
        </div>
      </details>
    </li>
  );
}

function Why({ idea: i }: { idea: Idea }) {
  const items: [string, string | null][] = [
    ["Thesis", i.thesis],
    ["Catalyst", i.catalyst],
    ["Risks", i.risks],
    ["Invalidation", i.invalidation],
    ["Alternatives considered", i.alternatives],
    ["Data gaps", i.data_gaps],
  ];
  return items.some(([, body]) => body) ? (
    <Prose items={items} />
  ) : (
    <p className="text-sm text-muted">No written rationale for this idea</p>
  );
}

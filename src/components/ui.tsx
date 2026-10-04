import Link from "next/link";
import type { ReactNode } from "react";
import { sign } from "@/lib/format";
import type { Num } from "@/lib/types";

export function Section({
  title,
  count,
  children,
  id,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        {title}
        {count !== undefined && (
          <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-medium normal-case tracking-normal">
            {count}
          </span>
        )}
      </h2>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-muted">{children}</p>;
}

/** Colours text by the sign of a DB value. */
export function Signed({ value, children }: { value: Num | null; children: ReactNode }) {
  const s = sign(value);
  return <span className={s > 0 ? "text-gain" : s < 0 ? "text-loss" : undefined}>{children}</span>;
}

/** A small muted line under a value, so qualifiers don't widen the layout. */
export function SubLabel({ children }: { children: ReactNode }) {
  return <span className="block text-[10px] uppercase leading-3 tracking-wide text-muted">{children}</span>;
}

/** A symbol linking to its trade page (keyed by signal_id, which survives ledger replays). */
export function SymbolLink({ id, symbol }: { id: number; symbol: string }) {
  return (
    <Link
      href={`/trade/${id}`}
      className="font-medium underline decoration-line underline-offset-4 hover:decoration-current"
    >
      {symbol}
    </Link>
  );
}

// ---------- Tooltips (HTML popover API, no JS) ----------

const CHIP = "rounded px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide";

/** The popover body. Render once per id; any number of TipButtons can open it. */
export function Tip({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} popover="auto" className="tip" role="tooltip">
      {children}
    </div>
  );
}

/** A chip-styled button that opens the Tip with this id; `title` is the fallback where popover is unsupported. */
export function TipButton({
  target,
  title,
  className = "",
  children,
}: {
  target: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      popoverTarget={target}
      title={title}
      className={`${CHIP} cursor-help underline decoration-dotted underline-offset-2 ${className}`}
    >
      {children}
    </button>
  );
}

/** A button and its own popover, for tooltips whose text is specific to one row. */
export function InfoTip({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const text = typeof children === "string" ? children : "Show details";
  return (
    <>
      <TipButton target={id} title={text} className={className}>
        {label}
      </TipButton>
      <Tip id={id}>{children}</Tip>
    </>
  );
}

export const RETRO_TIP_ID = "tip-retro";
const RETRO_TEXT = "Retro-seeded: the signal was recorded after the fact";

/** Rendered once in the layout; every RetroBadge opens it. */
export function RetroTip() {
  return <Tip id={RETRO_TIP_ID}>{RETRO_TEXT}</Tip>;
}

export function RetroBadge() {
  return (
    <TipButton target={RETRO_TIP_ID} title={RETRO_TEXT} className="ml-1.5 bg-chip text-muted">
      retro
    </TipButton>
  );
}

// ---------- Chips ----------

/** The skill's why-grade (A–D). The letter carries the meaning, so no colour coding. */
export function WhyGrade({ grade }: { grade: string | null }) {
  return <span className={`${CHIP} bg-chip font-semibold`}>{grade ? `Grade ${grade}` : "Grade n/a"}</span>;
}

const STATUS: Record<string, { glyph: string; cls: string; label: string }> = {
  pass: { glyph: "✓", cls: "text-gain", label: "pass" },
  weak: { glyph: "~", cls: "bg-warn-bg text-warn-fg", label: "weak" },
  fail: { glyph: "✗", cls: "text-loss", label: "fail" },
};

/** Checklist status: green ✓, amber ~, red ✗, grey – for pending and n/a. Text label always present. */
export function StatusChip({ status }: { status: string }) {
  const s = STATUS[status] ?? { glyph: "–", cls: "text-muted", label: status };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-medium ${s.cls}`}
    >
      <span aria-hidden>{s.glyph}</span>
      {s.label}
    </span>
  );
}

/** Pass / weak / fail counts. A zero count is muted. */
export function CountChips({
  passes,
  weak,
  fails,
}: {
  passes: number | null;
  weak: number | null;
  fails: number | null;
}) {
  const items = [
    { n: passes, glyph: "✓", cls: "text-gain", label: "passed" },
    { n: weak, glyph: "~", cls: "bg-warn-bg text-warn-fg", label: "weak" },
    { n: fails, glyph: "✗", cls: "text-loss", label: "failed" },
  ];
  return (
    <span className="inline-flex gap-1.5">
      {items.map(({ n, glyph, cls, label }) => {
        const zero = !n;
        return (
          <span
            key={label}
            aria-label={`${n ?? "n/a"} ${label}`}
            className={`rounded-full border border-line px-2 py-0.5 text-xs font-semibold tabular-nums ${zero ? "text-muted opacity-60" : cls}`}
          >
            <span aria-hidden>
              {glyph} {n ?? "n/a"}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export type Tone = "good" | "bad" | "neutral";

/** A review or auto tag. Tone tints the text; the tag name is always shown. */
export function TagChip({ tag, tone = "neutral", prefix }: { tag: string; tone?: Tone; prefix?: string }) {
  const cls = tone === "good" ? "text-gain" : tone === "bad" ? "text-loss" : "text-muted";
  return (
    <span className={`inline-block rounded bg-chip px-1.5 py-0.5 text-xs font-medium ${cls}`}>
      {prefix && <span className="text-muted">{prefix}: </span>}
      {tag}
    </span>
  );
}

/** A neutral uppercase marker, e.g. "pilot", "unresolved", "partial". */
export function Marker({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <span className={`${CHIP} ml-1.5 ${warn ? "bg-warn-bg text-warn-fg" : "bg-chip text-muted"}`}>{children}</span>
  );
}

const VERDICT_BG: Record<string, string> = {
  ENTRY: "bg-v-entry",
  ENTRY_REDUCED: "bg-v-reduced",
  WAIT_ALERT: "bg-v-alert",
  WAIT: "bg-v-wait",
  HOLD: "bg-v-hold",
  NO_GO: "bg-v-nogo",
};

/** Fixed verdict order used by the runs page; unknown verdicts follow alphabetically. */
export const VERDICT_ORDER = ["ENTRY", "ENTRY_REDUCED", "WAIT_ALERT", "WAIT", "HOLD", "NO_GO"];

export function verdictRank(v: string): number {
  const i = VERDICT_ORDER.indexOf(v);
  return i === -1 ? VERDICT_ORDER.length : i;
}

export function verdictBg(v: string): string {
  return VERDICT_BG[v] ?? "bg-muted";
}

/** A coloured dot that keeps a verdict's colour consistent; the verdict name is always next to it. */
export function VerdictDot({ verdict }: { verdict: string }) {
  return <span aria-hidden className={`inline-block h-2 w-2 shrink-0 rounded-full ${verdictBg(verdict)}`} />;
}

// ---------- Text blocks ----------

/** A label/value pair for definition-list grids. */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 tabular-nums">{children}</dd>
    </div>
  );
}

/** Headed paragraphs; entries with a null body are omitted. Returns null when all are empty. */
export function Prose({ items }: { items: [string, string | null | undefined][] }) {
  const shown = items.filter(([, body]) => body);
  if (shown.length === 0) return null;
  return (
    <div className="space-y-3 text-sm">
      {shown.map(([heading, body]) => (
        <div key={heading}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{heading}</h4>
          <p className="mt-0.5 whitespace-pre-line">{body}</p>
        </div>
      ))}
    </div>
  );
}

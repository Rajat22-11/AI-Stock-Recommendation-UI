import type { ReactNode } from "react";
import { Empty, RetroBadge, Section, Table, Td, WhyGrade } from "@/components/ui";
import {
  asNumber,
  closeVsPivotPct,
  count,
  day,
  na,
  pct,
  plain,
  plainPct,
  price,
} from "@/lib/format";
import type { Suggestion, WatchAlert } from "@/lib/types";

// Checklist thresholds are UI constants compared against stored values; nothing is recomputed.
const VOL_THRESHOLD = 2;

const HEAD = [
  "Symbol",
  "Signal date",
  "Verdict",
  "Entry zone",
  "Stop (8% below fill)",
  "Trim (+25%)",
  "Size",
  "Entry window",
  "Paper status",
];

export function Suggestions({
  suggestions,
  alerts,
  monthLabel,
}: {
  suggestions: Suggestion[];
  alerts: WatchAlert[];
  monthLabel: string;
}) {
  return (
    <Section title="Suggestions this month" count={suggestions.length}>
      <p className="-mt-2 mb-3 text-xs text-muted">{monthLabel} · ENTRY and ENTRY_REDUCED signals, newest first</p>

      {suggestions.length === 0 ? (
        <Empty>No suggestions this month</Empty>
      ) : (
        <Table head={HEAD}>
          {suggestions.map((s) => (
            <SuggestionRows key={s.id} s={s} />
          ))}
        </Table>
      )}

      <details className="mt-4 rounded-lg border border-line">
        <summary className="flex cursor-pointer items-baseline gap-2 px-3 py-2 text-sm font-medium">
          Watchlist alerts
          <span className="rounded-full bg-chip px-2 py-0.5 text-xs font-medium">{alerts.length}</span>
        </summary>
        <div className="px-3 pb-2">
          {alerts.length === 0 ? (
            <Empty>No watchlist alerts this month</Empty>
          ) : (
            <Table head={["Symbol", "Signal date", "Trigger", "Required volume"]}>
              {alerts.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <Td left>
                    <span className="font-medium">{a.symbol}</span>
                    {a.retro_seeded && <RetroBadge />}
                  </Td>
                  <Td>{day(a.signal_date)}</Td>
                  <Td>{price(a.alert_trigger)}</Td>
                  <Td>{count(a.req_vol_abs)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </details>

      <p className="mt-4 text-xs text-muted">Paper-trading signals, not investment advice.</p>
    </Section>
  );
}

function SuggestionRows({ s }: { s: Suggestion }) {
  const pos = s.positions;
  const filled = Boolean(pos?.fill_date);

  return (
    <>
      <tr>
        <Td left>
          <span className="font-medium">{s.symbol}</span>
          {s.retro_seeded && <RetroBadge />}
        </Td>
        <Td>{day(s.signal_date)}</Td>
        <Td>
          {s.verdict}
          {s.verdict === "ENTRY_REDUCED" && <SubLabel>half size</SubLabel>}
        </Td>
        <Td>
          {price(s.entry_low)} – {price(s.entry_high)}
        </Td>
        <Td>{filled ? price(pos?.stop_at_fill) : <Planned>{price(s.stop)}</Planned>}</Td>
        <Td>{filled ? price(pos?.trim_price) : <Planned>{price(s.trim_price)}</Planned>}</Td>
        <Td>{plainPct(s.size_pct)}</Td>
        <Td>
          {day(s.window_start)} – {day(s.window_end)}
        </Td>
        <Td>{paperStatus(s)}</Td>
      </tr>
      <tr className="border-b border-line last:border-0">
        <td colSpan={HEAD.length} className="pb-2">
          {/* Pinned to the visible width so the text wraps on phones while the table scrolls sideways. */}
          <details className="sticky left-0 w-[calc(100vw-4rem)] max-w-2xl">
            <summary className="flex cursor-pointer items-center gap-2 text-xs text-muted">
              Why <WhyGrade grade={s.why_grade} />
            </summary>
            <Why s={s} />
          </details>
        </td>
      </tr>
    </>
  );
}

function paperStatus(s: Suggestion): string {
  const pos = s.positions;
  if (!pos) return "not in ledger yet";
  if (pos.status === "skipped") return pos.exit_reason ? `skipped · ${pos.exit_reason}` : "skipped";
  return pos.status;
}

function Why({ s }: { s: Suggestion }) {
  const cvp = closeVsPivotPct(s.signal_close, s.pivot);
  const vol = asNumber(s.vol_mult);
  const reqVol = asNumber(s.req_vol_mult);

  return (
    <div className="mt-2 whitespace-normal text-sm">
      <p className="mb-2">{s.why_text ?? "n/a"}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs tabular-nums">
        <Check label="Close vs pivot" pass={cvp === null ? null : cvp > 0}>
          {cvp === null ? "n/a" : `${price(s.signal_close)} vs ${price(s.pivot)} · ${pct(cvp)}`}
        </Check>
        <Check label="Volume" pass={vol === null ? null : vol >= VOL_THRESHOLD}>
          {vol === null ? "n/a" : `${price(vol)}× vs ${VOL_THRESHOLD}×`}
          {reqVol !== null && reqVol !== VOL_THRESHOLD && (
            <span className="text-muted"> (signal required {plain(reqVol)}×)</span>
          )}
        </Check>
        <Check label="Correction">{na(plainPct(s.correction_pct))}</Check>
        <Check label="Distance from SMA13" pass={s.sma13_rising}>
          {na(pct(s.dist_sma_pct))} · SMA13 rising: {yesNo(s.sma13_rising)}
        </Check>
        <Check label="Base range">{na(plainPct(s.base_range_pct))}</Check>
        <Check label="Close location">{na(plain(s.close_loc))}</Check>
        <Check label="Liquidity">{s.liquidity_tier ?? "n/a"}</Check>
      </dl>
    </div>
  );
}

function yesNo(v: boolean | null): string {
  return v === null ? "n/a" : v ? "yes" : "no";
}

/** One checklist line. `pass` is undefined for lines with no threshold, null when the input is missing. */
function Check({ label, pass, children }: { label: string; pass?: boolean | null; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd>
        {pass === true && (
          <span className="mr-1 text-gain" aria-label="pass">
            ✓
          </span>
        )}
        {pass === false && (
          <span className="mr-1 text-loss" aria-label="fail">
            ✗
          </span>
        )}
        {children}
      </dd>
    </>
  );
}

/** A small muted line under a cell value, so qualifiers don't widen the table. */
function SubLabel({ children }: { children: ReactNode }) {
  return <span className="block text-[10px] uppercase leading-3 tracking-wide text-muted">{children}</span>;
}

function Planned({ children }: { children: ReactNode }) {
  return (
    <span title="Planned by the signal; replaced by the ledger's value once filled">
      {children}
      <SubLabel>planned</SubLabel>
    </span>
  );
}

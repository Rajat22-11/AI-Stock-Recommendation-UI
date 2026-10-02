import type { ReactNode } from "react";
import { sign } from "@/lib/format";
import type { Num } from "@/lib/types";

export function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
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

export function RetroBadge() {
  return (
    <span
      title="Retro-seeded: the signal was recorded after the fact"
      className="ml-1.5 rounded bg-chip px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-muted"
    >
      retro
    </span>
  );
}

/** Colours text by the sign of a DB value. */
export function Signed({ value, children }: { value: Num | null; children: ReactNode }) {
  const s = sign(value);
  return <span className={s > 0 ? "text-gain" : s < 0 ? "text-loss" : undefined}>{children}</span>;
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[560px] text-sm tabular-nums">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            {head.map((h, i) => (
              <th key={i} className={`whitespace-nowrap py-2 pr-3 font-medium ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, left }: { children: ReactNode; left?: boolean }) {
  return <td className={`whitespace-nowrap py-2 pr-3 ${left ? "text-left" : "text-right"}`}>{children}</td>;
}

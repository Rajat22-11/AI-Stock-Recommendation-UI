import { day, inr } from "@/lib/format";
import type { EquityRow } from "@/lib/types";

// Server-rendered SVG: no chart library and no client JS. Values are plotted as the
// DB returns them; the only arithmetic here is mapping values to pixels. Labels are
// HTML so the SVG can stretch to any width without scaling text.
const W = 1000;
const H = 200;
const PAD_Y = 12;

export function EquityCurve({ rows }: { rows: EquityRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No equity history yet.</p>;
  }
  if (rows.length === 1) {
    return (
      <p className="text-sm text-muted">
        Equity {inr(rows[0].equity)} on {day(rows[0].as_of)}. The curve starts after the first fill.
      </p>
    );
  }

  const values = rows.map((r) => Number(r.equity));
  const capital = Number(rows[0].capital);
  const lo = Math.min(capital, ...values);
  const hi = Math.max(capital, ...values);
  const span = hi - lo || 1;
  const yMin = lo - span * 0.1;
  const yMax = hi + span * 0.1;

  const x = (i: number) => (i * W) / (rows.length - 1);
  const y = (v: number) => PAD_Y + ((yMax - v) * (H - 2 * PAD_Y)) / (yMax - yMin);

  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const first = rows[0];
  const last = rows[rows.length - 1];
  const below = values[values.length - 1] < capital;

  return (
    <figure>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs text-muted">
        <span>
          <span aria-hidden className="mr-1 inline-block w-4 border-t border-dashed border-muted align-middle" />
          Capital {inr(capital)}
        </span>
        <span>
          Now <span className={`font-semibold ${below ? "text-loss" : "text-gain"}`}>{inr(last.equity)}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-40 w-full sm:h-52"
        role="img"
        aria-label={`Equity from ${day(first.as_of)} (${inr(first.equity)}) to ${day(last.as_of)} (${inr(last.equity)})`}
      >
        <line
          x1={0}
          x2={W}
          y1={y(capital)}
          y2={y(capital)}
          className="stroke-muted"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points}
          fill="none"
          className={below ? "stroke-loss" : "stroke-gain"}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted">
        <span>{day(first.as_of)}</span>
        <span>{day(last.as_of)}</span>
      </figcaption>
    </figure>
  );
}

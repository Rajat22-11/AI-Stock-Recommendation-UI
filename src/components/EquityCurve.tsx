import { ChartCursor } from "@/components/ChartCursor";
import { lakhLabel, niceTicks } from "@/lib/chart";
import { day, inr, pct } from "@/lib/format";
import type { EquityRow } from "@/lib/types";

// Server-rendered SVG with HTML labels, so the SVG can stretch to any width without
// scaling text. Values are plotted as the DB returns them; the only arithmetic here is
// mapping values to pixels and choosing axis ticks. The hover/keyboard readout is a
// small client overlay fed pre-formatted strings.
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
  const span = hi - lo || Math.max(1, hi * 0.01);
  const yMin = lo - span * 0.1;
  const yMax = hi + span * 0.1;
  const { ticks, step } = niceTicks(yMin, yMax, 4);

  const x = (i: number) => (i * W) / (rows.length - 1);
  const y = (v: number) => PAD_Y + ((yMax - v) * (H - 2 * PAD_Y)) / (yMax - yMin);

  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const first = rows[0];
  const last = rows[rows.length - 1];
  const below = values[values.length - 1] < capital;

  const cursor = rows.map((r, i) => ({
    x: (x(i) / W) * 100,
    y: (y(values[i]) / H) * 100,
    lines: [day(r.as_of), inr(r.equity), `Return ${pct(r.return_pct)}`],
  }));

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
      <div className="flex gap-2">
        <div aria-hidden className="relative w-12 shrink-0 text-right text-[10px] tabular-nums text-muted sm:w-14">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(y(t) / H) * 100}%` }}>
              {lakhLabel(t, step)}
            </span>
          ))}
        </div>
        <div className="relative h-40 min-w-0 flex-1 sm:h-52">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full"
            role="img"
            aria-label={`Equity from ${day(first.as_of)} (${inr(first.equity)}) to ${day(last.as_of)} (${inr(last.equity)})`}
          >
            {ticks.map((t) => (
              <line
                key={t}
                x1={0}
                x2={W}
                y1={y(t)}
                y2={y(t)}
                className="stroke-line"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
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
          <ChartCursor points={cursor} label="Equity curve" />
        </div>
      </div>
      <figcaption className="mt-1 flex justify-between pl-14 text-xs text-muted sm:pl-16">
        <span>{day(first.as_of)}</span>
        <span>{day(last.as_of)}</span>
      </figcaption>
    </figure>
  );
}

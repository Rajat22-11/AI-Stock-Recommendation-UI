import { ChartCursor } from "@/components/ChartCursor";
import { niceTicks, priceLabel } from "@/lib/chart";
import { day, price } from "@/lib/format";
import type { Candle } from "@/lib/weekly";

export type Level = { key: string; label: string; value: number; tone: "muted" | "fg" | "loss" | "gain" | "warn"; dashed?: boolean };
export type Marker = { weekEnd: string; price: number; kind: "fill" | "trim" | "exit"; label: string };

/** Fewer weekly candles than this and the chart says there is not enough history. */
export const MIN_WEEKS = 4;

const W = 1000;
const H = 300;
const PAD = 0.06;

const STROKE: Record<Level["tone"], string> = {
  muted: "stroke-muted",
  fg: "stroke-foreground",
  loss: "stroke-loss",
  gain: "stroke-gain",
  warn: "stroke-warn-fg",
};
const TEXT: Record<Level["tone"], string> = {
  muted: "text-muted",
  fg: "text-foreground",
  loss: "text-loss",
  gain: "text-gain",
  warn: "text-warn-fg",
};
const BORDER: Record<Level["tone"], string> = {
  muted: "border-muted",
  fg: "border-foreground",
  loss: "border-loss",
  gain: "border-gain",
  warn: "border-warn-fg",
};
const GLYPH: Record<Marker["kind"], string> = { fill: "▲", trim: "◆", exit: "▼" };

/**
 * Weekly candles as a server-rendered SVG with HTML labels and markers, plus the shared
 * client cursor for the OHLC readout. Candle values come from toWeekly(); levels and
 * markers are stored plan, position and event values.
 */
export function CandleChart({ candles, levels, markers }: { candles: Candle[]; levels: Level[]; markers: Marker[] }) {
  if (candles.length < MIN_WEEKS) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          Not enough price history yet ({candles.length} {candles.length === 1 ? "week" : "weeks"}). The chart appears once
          {" "}{MIN_WEEKS} weekly candles are available.
        </p>
        <LevelLegend levels={levels} markers={markers} />
      </div>
    );
  }

  const values = [...candles.flatMap((c) => [c.high, c.low]), ...levels.map((l) => l.value), ...markers.map((m) => m.price)];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || hi * 0.02 || 1;
  const yMin = lo - span * PAD;
  const yMax = hi + span * PAD;
  const { ticks, step } = niceTicks(yMin, yMax, 5);

  const slot = W / candles.length;
  const cx = (i: number) => slot * (i + 0.5);
  const y = (v: number) => ((yMax - v) / (yMax - yMin)) * H;
  const pctY = (v: number) => (y(v) / H) * 100;
  const body = Math.max(1, slot * 0.6);
  const weekIndex = new Map(candles.map((c, i) => [c.weekEnd, i]));

  const labels = spreadLabels(levels.map((l) => ({ ...l, top: pctY(l.value) })));

  const cursor = candles.map((c, i) => ({
    x: (cx(i) / W) * 100,
    lines: [
      `Week ending ${day(c.weekEnd)}`,
      `O ${price(c.open)}  H ${price(c.high)}`,
      `L ${price(c.low)}  C ${price(c.close)}`,
    ],
  }));

  return (
    <figure className="space-y-3">
      <div className="flex gap-2">
        <div aria-hidden className="relative w-12 shrink-0 text-right text-[10px] tabular-nums text-muted">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${pctY(t)}%` }}>
              {priceLabel(t, step)}
            </span>
          ))}
        </div>
        <div className="relative h-64 min-w-0 flex-1 sm:h-80">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            role="img"
            aria-label={`Weekly candles, ${candles.length} weeks ending ${day(candles.at(-1)!.weekEnd)}`}
          >
            {ticks.map((t) => (
              <line key={t} x1={0} x2={W} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            {candles.map((c, i) => {
              const up = c.close >= c.open;
              const top = y(Math.max(c.open, c.close));
              const bottom = y(Math.min(c.open, c.close));
              return (
                <g key={c.weekEnd} className={up ? "fill-gain stroke-gain" : "fill-loss stroke-loss"}>
                  <line x1={cx(i)} x2={cx(i)} y1={y(c.high)} y2={y(c.low)} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  <rect
                    x={cx(i) - body / 2}
                    width={body}
                    y={top}
                    height={Math.max(bottom - top, 0.8)}
                    fillOpacity={up ? 0.35 : 0.85}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
            {levels.map((l) => (
              <line
                key={l.key}
                x1={0}
                x2={W}
                y1={y(l.value)}
                y2={y(l.value)}
                className={STROKE[l.tone]}
                strokeWidth={1.25}
                strokeDasharray={l.dashed ? "6 4" : undefined}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {markers.map((m, k) => {
            const i = weekIndex.get(m.weekEnd);
            if (i === undefined) return null;
            return (
              <span
                key={k}
                aria-hidden
                title={m.label}
                className={`absolute -translate-x-1/2 -translate-y-1/2 text-xs leading-none ${m.kind === "fill" ? "text-foreground" : m.kind === "trim" ? "text-gain" : "text-loss"}`}
                style={{ left: `${(cx(i) / W) * 100}%`, top: `${pctY(m.price)}%` }}
              >
                {GLYPH[m.kind]}
              </span>
            );
          })}

          <ChartCursor points={cursor} label="Weekly candles" />
        </div>
        <div aria-hidden className="relative w-16 shrink-0 text-[10px] tabular-nums sm:w-20">
          {labels.map((l) => (
            <span key={l.key} className={`absolute left-0 -translate-y-1/2 whitespace-nowrap ${TEXT[l.tone]}`} style={{ top: `${l.top}%` }}>
              {l.label} {priceLabel(l.value, 0.01)}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="pl-14 text-xs text-muted">
        Weekly candles (weeks ending Friday) built from daily bars. {day(candles[0].weekEnd)} – {day(candles.at(-1)!.weekEnd)}.
      </figcaption>
      <LevelLegend levels={levels} markers={markers} />
    </figure>
  );
}

/** Nudges right-gutter labels apart so close levels don't print on top of each other. */
function spreadLabels<T extends { top: number }>(items: T[], gap = 6): T[] {
  const sorted = [...items].sort((a, b) => a.top - b.top);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].top - sorted[i - 1].top < gap) sorted[i] = { ...sorted[i], top: sorted[i - 1].top + gap };
  }
  return sorted;
}

function LevelLegend({ levels, markers }: { levels: Level[]; markers: Marker[] }) {
  if (levels.length === 0 && markers.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
      {levels.map((l) => (
        <li key={l.key} className="flex items-center gap-1.5">
          <span aria-hidden className={`inline-block w-4 border-t-2 ${l.dashed ? "border-dashed" : ""} ${BORDER[l.tone]}`} />
          <span className="text-muted">{l.label}</span> {price(l.value)}
        </li>
      ))}
      {markers.map((m, k) => (
        <li key={`m${k}`} className="flex items-center gap-1.5">
          <span aria-hidden>{GLYPH[m.kind]}</span>
          <span className="text-muted">{m.label}</span> {price(m.price)}
        </li>
      ))}
    </ul>
  );
}

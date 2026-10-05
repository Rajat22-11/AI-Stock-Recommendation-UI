"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

export type CursorPoint = {
  /** Horizontal position as a percentage of the plot width. */
  x: number;
  /** Optional vertical position (percentage of plot height) for a dot. */
  y?: number;
  /** Tooltip lines; all strings are pre-formatted on the server. */
  lines: string[];
};

/**
 * Transparent overlay on a server-rendered chart: shows the nearest point's values on
 * mouse hover, touch, or keyboard focus (arrow keys, Home, End), and announces them.
 */
export function ChartCursor({ points, label }: { points: CursorPoint[]; label: string }) {
  const [idx, setIdx] = useState<number | null>(null);
  if (points.length === 0) return null;

  const nearest = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 100;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(points[i].x - x) < Math.abs(points[best].x - x)) best = i;
    }
    setIdx(best);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const last = points.length - 1;
    const cur = idx ?? last;
    const next =
      e.key === "ArrowLeft" ? Math.max(0, cur - 1)
      : e.key === "ArrowRight" ? Math.min(last, cur + 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : e.key === "Escape" ? null
      : undefined;
    if (next === undefined) return;
    e.preventDefault();
    setIdx(next);
  };

  const p = idx === null ? null : points[idx];
  const flip = p !== null && p.x > 60;

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${label}. Use left and right arrow keys to read values.`}
      className="absolute inset-0 cursor-crosshair touch-pan-y rounded outline-none focus-visible:ring-2 focus-visible:ring-muted"
      onPointerMove={nearest}
      onPointerDown={nearest}
      onPointerLeave={(e) => e.pointerType === "mouse" && setIdx(null)}
      onFocus={() => setIdx((i) => i ?? points.length - 1)}
      onBlur={() => setIdx(null)}
      onKeyDown={onKey}
    >
      {p && (
        <>
          <div aria-hidden className="absolute inset-y-0 w-px bg-muted/60" style={{ left: `${p.x}%` }} />
          {p.y !== undefined && (
            <div
              aria-hidden
              className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-foreground"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            />
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs tabular-nums shadow-lg"
            style={flip ? { right: `${100 - p.x}%`, marginRight: 8 } : { left: `${p.x}%`, marginLeft: 8 }}
          >
            {p.lines.map((l, i) => (
              <div key={i} className={i === 0 ? "font-medium" : "text-muted"}>
                {l}
              </div>
            ))}
          </div>
        </>
      )}
      <div className="sr-only" aria-live="polite">
        {p ? p.lines.join(", ") : ""}
      </div>
    </div>
  );
}

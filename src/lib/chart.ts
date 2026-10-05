// Chart layout helpers: axis ticks and labels only. No trading figures are derived here.

/** About `count` round tick values (1, 2, 2.5 or 5 × 10ⁿ steps) inside [lo, hi]. */
export function niceTicks(lo: number, hi: number, count = 4): { ticks: number[]; step: number } {
  const span = hi - lo;
  if (!(span > 0)) return { ticks: [lo], step: 1 };
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag);
  const ticks: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + step * 1e-9; t += step) {
    ticks.push(Number(t.toFixed(10)));
  }
  return { ticks, step };
}

/** Short INR axis label in lakhs: 997500 → "₹9.98L"; decimals follow the tick step. */
export function lakhLabel(v: number, step: number): string {
  if (Math.abs(v) < 1e5) return "₹" + Math.round(v).toLocaleString("en-IN");
  const decimals = Math.min(3, Math.max(0, Math.ceil(-Math.log10(step / 1e5) - 1e-9)));
  return `₹${(v / 1e5).toFixed(decimals)}L`;
}

/** Price axis label: up to 2 decimals as the step needs, Indian grouping. */
export function priceLabel(v: number, step: number): string {
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  return v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

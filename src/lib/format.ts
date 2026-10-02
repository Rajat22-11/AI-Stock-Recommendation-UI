// Display formatting only: no trading math happens here.
import type { Num } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toNumber(v: Num | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** ₹ amount with Indian grouping: 1000000 → "₹10,00,000"; decimals=2 → "-₹1,234.50". */
export function inr(v: Num | null | undefined, decimals: 0 | 2 = 0): string {
  const n = toNumber(v);
  if (n === null) return "—";
  return (decimals === 2 ? inr2 : inr0).format(n);
}

/** ₹ amount with an explicit sign for P&L: "+₹1,234" / "-₹1,234". */
export function signedInr(v: Num | null | undefined, decimals: 0 | 2 = 0): string {
  const n = toNumber(v);
  if (n === null) return "—";
  return (n > 0 ? "+" : "") + inr(n, decimals);
}

/** Plain price with Indian grouping and 2 decimals: 1891.3 → "1,891.30". */
export function price(v: Num | null | undefined): string {
  const n = toNumber(v);
  return n === null ? "—" : num2.format(n);
}

/** Signed percentage with 2 decimals: -2.333 → "-2.33%". */
export function pct(v: Num | null | undefined): string {
  const n = toNumber(v);
  if (n === null) return "—";
  return (n > 0 ? "+" : "") + n.toFixed(2) + "%";
}

/** Sign of a DB value, for colouring: 1, -1 or 0. */
export function sign(v: Num | null | undefined): number {
  const n = toNumber(v);
  return n === null ? 0 : Math.sign(n);
}

/** Postgres `date` string → "28 Sep 2026". String-based, so no timezone shift. */
export function day(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, dd] = d.slice(0, 10).split("-");
  const month = MONTHS[Number(m) - 1];
  if (!y || !month || !dd) return d;
  return `${Number(dd)} ${month} ${y}`;
}

/** Postgres `timestamptz` → IST wall-clock time, e.g. "2 Oct 2026, 4:43 pm IST". */
export function istTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  const t = new Date(ts);
  if (Number.isNaN(t.getTime())) return ts;
  return (
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(t) + " IST"
  );
}

/** Coerce a DB numeric for comparisons against UI constants (e.g. near-stop). */
export function asNumber(v: Num | null | undefined): number | null {
  return toNumber(v);
}

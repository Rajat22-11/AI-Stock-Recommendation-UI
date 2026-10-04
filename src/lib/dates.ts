// Calendar-month bounds in IST. Built from date strings, so the server's timezone never matters.

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const istDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type MonthBounds = {
  /** First day of the month, "YYYY-MM-01" (inclusive). */
  start: string;
  /** First day of the next month, "YYYY-MM-01" (exclusive). */
  next: string;
  /** e.g. "October 2026". */
  label: string;
};

/** The calendar month containing `now` as seen in Asia/Kolkata. */
export function istMonth(now: Date = new Date()): MonthBounds {
  const [y, m] = istDate.format(now).split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${y}-${pad(m)}-01`,
    next: `${ny}-${pad(nm)}-01`,
    label: `${MONTH_NAMES[m - 1]} ${y}`,
  };
}

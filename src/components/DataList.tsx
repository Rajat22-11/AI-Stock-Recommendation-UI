import type { ReactNode } from "react";

export type Column<T> = {
  label: string;
  cell: (row: T) => ReactNode;
  /** Shown on the card's first line next to the title column. The first column is always the title. */
  primary?: boolean;
  /** Table alignment; defaults to left for the first column and right for the rest. */
  align?: "left" | "right";
};

/**
 * A list that is a table at 640px and up and a stack of cards below, so no column is
 * hidden or needs sideways scrolling on a phone. Both forms are server-rendered; CSS
 * shows one. Row counts on this site are small, so the doubled markup is cheap.
 */
export function DataList<T>({
  rows,
  columns,
  rowKey,
  highlight,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  highlight?: (row: T) => boolean;
}) {
  const [title, ...rest] = columns;
  const primary = rest.filter((c) => c.primary);
  const secondary = rest.filter((c) => !c.primary);

  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              {columns.map((c, i) => (
                <th
                  key={c.label}
                  scope="col"
                  className={`whitespace-nowrap py-2 pr-3 font-medium last:pr-0 ${align(c, i) === "left" ? "text-left" : "text-right"}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={`border-b border-line last:border-0 ${highlight?.(row) ? "bg-warn-bg" : ""}`}
              >
                {columns.map((c, i) => (
                  <td
                    key={c.label}
                    className={`py-2 pr-3 align-top last:pr-0 ${align(c, i) === "left" ? "text-left" : "text-right"}`}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 sm:hidden">
        {rows.map((row) => (
          <li
            key={rowKey(row)}
            className={`rounded-lg border border-line p-3 text-sm tabular-nums ${highlight?.(row) ? "bg-warn-bg" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <div className="min-w-0 font-medium">{title.cell(row)}</div>
              {primary.length > 0 && (
                <dl className="flex gap-4 text-right">
                  {primary.map((c) => (
                    <div key={c.label}>
                      <dt className="text-[10px] uppercase tracking-wide text-muted">{c.label}</dt>
                      <dd className="font-semibold">{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {secondary.length > 0 && (
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line pt-2">
                {secondary.map((c) => (
                  <div key={c.label} className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wide text-muted">{c.label}</dt>
                    <dd className="break-words">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function align<T>(c: Column<T>, i: number): "left" | "right" {
  return c.align ?? (i === 0 ? "left" : "right");
}

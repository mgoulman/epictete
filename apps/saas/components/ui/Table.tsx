import { cn } from "./cn";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  align?: "left" | "right" | "center";
  /** true for money columns → tabular-nums + right align default */
  numeric?: boolean;
  render: (row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  /** Shown when there are no rows (first-run empty state). */
  empty?: React.ReactNode;
}

export function Table<T>({ columns, rows, rowKey, empty }: TableProps<T>) {
  const align = (c: Column<T>) =>
    c.align ?? (c.numeric ? "right" : "left");

  return (
    <div className="overflow-x-auto scroll-thin rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "px-4 py-3 font-medium text-[var(--color-muted-foreground)] whitespace-nowrap",
                  align(c) === "right" && "text-right",
                  align(c) === "center" && "text-center",
                  align(c) === "left" && "text-left",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--color-muted-foreground)]">
                {empty ?? "Aucune donnée."}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-secondary)]/50 transition-colors"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-3 text-[var(--color-foreground)]",
                      c.numeric && "tnum",
                      align(c) === "right" && "text-right",
                      align(c) === "center" && "text-center",
                      c.className,
                    )}
                  >
                    {c.render(row, i)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

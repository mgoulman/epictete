"use client";

import { useMemo, useState } from "react";
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn";
import type { Column } from "./Table";

export type DataColumn<T> = Column<T> & {
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
};

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T, i: number) => string;
  /** Enables the search box; return the searchable text for a row. */
  getSearchText?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  getSearchText,
  searchPlaceholder = "Rechercher…",
  pageSize = 12,
  empty,
  onRowClick,
}: DataTableProps<T>) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const align = (c: DataColumn<T>) => c.align ?? (c.numeric ? "right" : "left");

  const filtered = useMemo(() => {
    if (!getSearchText || !q.trim()) return rows;
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => getSearchText(r).toLowerCase().includes(needle));
  }, [rows, q, getSearchText]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(c: DataColumn<T>) {
    if (!c.sortable) return;
    if (sortKey === c.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(c.key); setSortDir("asc"); }
  }

  return (
    <div className="space-y-3">
      {getSearchText && (
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="w-full h-9 pl-9 pr-3 rounded-[var(--radius-sm)] bg-[var(--color-card)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
          />
        </div>
      )}

      <div className="overflow-x-auto scroll-thin rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c)}
                  className={cn(
                    "px-4 py-3 font-medium text-[var(--color-muted-foreground)] whitespace-nowrap select-none",
                    align(c) === "right" && "text-right",
                    align(c) === "center" && "text-center",
                    c.sortable && "cursor-pointer hover:text-[var(--color-foreground)]",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.header}
                    {c.sortable && sortKey === c.key && (sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[var(--color-muted-foreground)]">
                  {q.trim() ? "Aucun résultat." : empty ?? "Aucune donnée."}
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-secondary)]/50 transition-colors",
                    onRowClick && "cursor-pointer",
                  )}
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

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--color-muted-foreground)]">
          <span>{sorted.length} résultat{sorted.length > 1 ? "s" : ""}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-secondary)] disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">{safePage + 1} / {pageCount}</span>
            <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1} className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-secondary)] disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

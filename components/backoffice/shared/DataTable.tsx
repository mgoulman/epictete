'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
}

export function DataTable<T extends object>({
  data,
  columns,
  keyField,
  searchable = true,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  emptyMessage = 'No data found',
  onRowClick,
  actions
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = search
    ? data.filter(item =>
        columns.some(col => {
          const value = (item as Record<string, unknown>)[col.key];
          return String(value).toLowerCase().includes(search.toLowerCase());
        })
      )
    : data;

  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? comparison : -comparison;
      })
    : filteredData;

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Search */}
      {searchable && (
        <div className="p-3 border-b border-[var(--border)]">
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--background)] border border-[var(--border)]
                       rounded-md text-sm text-[var(--foreground)] placeholder-[var(--muted)]
                       focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent
                       transition-colors duration-150"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`px-4 py-2.5 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide
                            ${column.sortable ? 'cursor-pointer hover:text-[var(--foreground)]' : ''}
                            ${column.className || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && sortKey === column.key && (
                      sortDirection === 'asc' ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-8 text-center text-sm text-[var(--muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr
                  key={String(item[keyField])}
                  className={`border-b border-[var(--border)] last:border-b-0
                            hover:bg-[var(--secondary)]/50 transition-colors duration-100
                            ${onRowClick ? 'cursor-pointer' : ''}
                            ${index % 2 === 0 ? '' : 'bg-[var(--secondary)]/30'}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map(column => (
                    <td
                      key={column.key}
                      className={`px-4 py-2.5 text-sm text-[var(--foreground)] ${column.className || ''}`}
                    >
                      {column.render
                        ? column.render(item)
                        : String((item as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-2.5 text-right">
                      <div onClick={e => e.stopPropagation()}>
                        {actions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--secondary)]/30">
          <p className="text-xs text-[var(--muted)]">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md hover:bg-[var(--secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-100"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--muted-foreground)]" />
            </button>
            <span className="text-xs text-[var(--muted-foreground)] px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md hover:bg-[var(--secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-100"
            >
              <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

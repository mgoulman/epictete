'use client';

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc';

interface SortHeaderProps {
  label: string;
  field: string;
  currentSort: string;
  currentDir: SortDir;
  onSort: (field: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

/** Clickable column header with sort arrows. Works inside <th> or <div>/<span>. */
export function SortHeader({ label, field, currentSort, currentDir, onSort, align = 'left', className = '' }: SortHeaderProps) {
  const active = currentSort === field;
  const alignClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`inline-flex items-center gap-1 bg-transparent border-none cursor-pointer select-none whitespace-nowrap ${alignClass} ${className}`}
    >
      <span className={active ? 'text-foreground' : ''}>{label}</span>
      {active ? (
        currentDir === 'asc' ? (
          <ChevronUp className="w-3.5 h-3.5 text-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-foreground" />
        )
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

/**
 * Generic comparator for sorting arrays of objects.
 * Handles strings, numbers, dates, and nulls.
 */
export function sortCompare<T>(a: T, b: T, field: string, dir: SortDir): number {
  const av = getNestedValue(a, field);
  const bv = getNestedValue(b, field);

  // nulls last
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;

  let cmp = 0;
  if (typeof av === 'number' && typeof bv === 'number') {
    cmp = av - bv;
  } else {
    cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
  }
  return dir === 'asc' ? cmp : -cmp;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((o: unknown, k) => {
    if (o && typeof o === 'object' && k in (o as Record<string, unknown>)) {
      return (o as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

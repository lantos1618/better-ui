'use client';

import React, { useState, useMemo } from 'react';

// ============================================
// Types
// ============================================

export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Format cell value for display */
  format?: (value: unknown) => string;
}

export interface DataTableViewProps {
  /** Column definitions */
  columns: DataTableColumn[];
  /** Row data — each row is a key-value object */
  rows: Array<Record<string, unknown>>;
  /** Table title */
  title?: string;
  /** Caption below table */
  caption?: string;
  /** Max rows before pagination (0 = show all) */
  pageSize?: number;
  /** Loading state */
  loading?: boolean;
}

// ============================================
// Component
// ============================================

export function DataTableView({
  columns,
  rows,
  title,
  caption,
  pageSize = 0,
  loading = false,
}: DataTableViewProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = pageSize > 0 ? Math.ceil(sortedRows.length / pageSize) : 1;
  const displayRows = pageSize > 0 ? sortedRows.slice(page * pageSize, (page + 1) * pageSize) : sortedRows;

  const formatCell = (col: DataTableColumn, value: unknown): string => {
    if (col.format) return col.format(value);
    if (value == null) return '-';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  const alignClass = (align?: string) => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  if (loading && rows.length === 0) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4">
        <div className="flex items-center gap-2 text-zinc-400 text-sm">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
          <span>Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {title && (
        <div className="px-4 py-3 border-b border-zinc-700">
          <div className="flex items-center justify-between">
            <p className="text-zinc-300 text-sm font-medium">{title}</p>
            <span className="text-zinc-500 text-xs font-mono">{rows.length} rows</span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-zinc-500 text-xs font-medium uppercase tracking-wider ${alignClass(col.align)} ${
                    col.sortable ? 'cursor-pointer hover:text-zinc-300 select-none' : ''
                  }`}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-zinc-400">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/50">
            {displayRows.map((row, i) => (
              <tr key={i} className="hover:bg-zinc-700/20 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-2.5 text-zinc-300 ${alignClass(col.align)}`}>
                    {formatCell(col, row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-zinc-500 text-sm">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-zinc-700 flex items-center justify-between">
          <span className="text-zinc-500 text-xs">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {caption && (
        <div className="px-4 py-2 border-t border-zinc-700">
          <p className="text-zinc-600 text-xs">{caption}</p>
        </div>
      )}
    </div>
  );
}

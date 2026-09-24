import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageNumber?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No records found',
  pageNumber = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center space-y-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-xs text-slate-500 font-medium">Loading records...</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-xs font-semibold text-slate-700 uppercase tracking-wider ${
                    col.className || ''
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-xs text-slate-500 font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors hover:bg-slate-50/80 ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3 px-4 text-xs text-slate-800 ${col.className || ''}`}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Wireframe-style Pagination Bar */}
      {totalPages > 1 && onPageChange && (
        <div className="border-t border-slate-200 px-4 py-3 bg-white flex items-center justify-center gap-1.5">
          <button
            onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`h-7 min-w-[28px] px-2 rounded-lg text-xs font-semibold transition ${
                p === pageNumber
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => onPageChange(Math.min(totalPages, pageNumber + 1))}
            disabled={pageNumber >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

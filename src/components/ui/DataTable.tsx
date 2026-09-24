import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { downloadCSV, downloadExcel } from '@/lib/exportUtils';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  exportValue?: (row: T) => string | number | null | undefined;
  className?: string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  exportFileName?: string;
  disableExport?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  empty,
  exportFileName = 'export_data',
  disableExport = false,
}: DataTableProps<T>) {
  if (data.length === 0 && empty) {
    return <>{empty}</>;
  }

  // Filter columns that have a header (exclude empty headers like action columns)
  const exportableColumns = columns.filter((col) => col.header && col.header.trim() !== '');

  const extractExportRow = (row: T): (string | number)[] => {
    return exportableColumns.map((col) => {
      if (col.exportValue) {
        const customVal = col.exportValue(row);
        return customVal ?? '';
      }
      const rawVal = (row as Record<string, unknown>)[col.key];
      if (rawVal === null || rawVal === undefined) return '';
      if (typeof rawVal === 'string' || typeof rawVal === 'number') return rawVal;
      if (typeof rawVal === 'boolean') return rawVal ? 'Yes' : 'No';
      if (typeof rawVal === 'object') {
        const obj = rawVal as Record<string, unknown>;
        if (obj.name && typeof obj.name === 'string') return obj.name;
        if (obj.code && typeof obj.code === 'string') return obj.code;
        if (obj.po_number && typeof obj.po_number === 'string') return obj.po_number;
        if (obj.grn_number && typeof obj.grn_number === 'string') return obj.grn_number;
      }
      return String(rawVal);
    });
  };

  const handleExportCSV = () => {
    const headers = exportableColumns.map((c) => c.header);
    const rows = data.map(extractExportRow);
    downloadCSV(exportFileName, headers, rows);
  };

  const handleExportExcel = () => {
    const headers = exportableColumns.map((c) => c.header);
    const rows = data.map(extractExportRow);
    downloadExcel(exportFileName, headers, rows);
  };

  return (
    <div className="space-y-2">
      {!disableExport && data.length > 0 && (
        <div className="flex items-center justify-between px-1 py-1">
          <span className="text-xs text-slate-500 font-medium">
            Showing {data.length} {data.length === 1 ? 'record' : 'records'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title="Export to CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              Export CSV
            </button>
            <button
              onClick={handleExportExcel}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50 px-2.5 py-1 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-100 hover:text-emerald-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Export Excel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-slate-50'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('whitespace-nowrap px-4 py-3 text-slate-700', col.className)}
                  >
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

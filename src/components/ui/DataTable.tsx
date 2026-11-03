import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "./cn";

export type SortDirection = "asc" | "desc";

export interface DataColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
  sortable?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  compact = false,
  sort,
  onSort,
  caption,
  className,
}: {
  columns: Array<DataColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string | number;
  empty?: ReactNode;
  compact?: boolean;
  sort?: { columnId: string; direction: SortDirection };
  onSort?: (columnId: string, direction: SortDirection) => void;
  caption?: string;
  className?: string;
}) {
  const hizalama = (hizala?: DataColumn<T>["align"]) => hizala === "center" ? "text-center" : hizala === "right" ? "text-right" : "text-left";
  return (
    // relative: sr-only caption (absolute) kaydırma kabının dışına taşıp sayfayı yatay kaydırmasın (D9).
    <div className={cn("relative overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card", className)}>
      <table className="w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((sutun) => {
              const aktif = sort?.columnId === sutun.id;
              const ariaSort = sutun.sortable ? (aktif ? (sort?.direction === "asc" ? "ascending" : "descending") : "none") : undefined;
              return (
                <th key={sutun.id} scope="col" aria-sort={ariaSort} className={cn("whitespace-nowrap px-4 py-3", hizalama(sutun.align), sutun.className)}>
                  {sutun.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(sutun.id, aktif && sort?.direction === "asc" ? "desc" : "asc")} className="inline-flex items-center gap-1 rounded-md hover:text-slate-800">
                      {sutun.header}
                      {aktif ? (sort?.direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ChevronsUpDown size={12} className="text-slate-400" />}
                    </button>
                  ) : sutun.header}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="transition-colors hover:bg-slate-50/80">
              {columns.map((sutun) => <td key={sutun.id} className={cn(compact ? "px-4 py-2" : "px-4 py-3", hizalama(sutun.align), sutun.className)}>{sutun.cell(row)}</td>)}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">{empty ?? "Gösterilecek kayıt yok."}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}


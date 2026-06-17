import { ReactNode, useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { FolderSearch, LayoutList } from "lucide-react"

export interface Column<T> {
  key: string;
  header: ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  width?: string;
  cell: (row: T) => ReactNode;
}

interface AdminTableProps<T = any> {
  // Legacy props
  headers?: ReactNode[];
  children?: ReactNode;
  
  // New props
  columns?: Column<T>[];
  data?: T[];
  defaultSort?: { key: string; dir: "asc" | "desc" };
  sortFn?: (key: string, dir: "asc" | "desc") => (a: T, b: T) => number;
  rowHeight?: string;

  className?: string;
  isEmpty?: boolean;
  isLoading?: boolean;
}

export default function AdminTable<T>({ 
  headers, children, columns, data, defaultSort, sortFn, rowHeight, className, isEmpty, isLoading 
}: AdminTableProps<T>) {
  
  const [sort, setSort] = useState(defaultSort ?? null);
  const [density, setDensity] = useState<"compact"|"normal">(() => 
    (localStorage.getItem("table_density") as "compact"|"normal") || "normal"
  );

  useEffect(() => { localStorage.setItem("table_density", density); }, [density]);

  const sortedData = useMemo(() => {
    if (!data) return [];
    if (!sort || !sortFn) return data;
    return [...data].sort(sortFn(sort.key, sort.dir));
  }, [data, sort, sortFn]);

  const thClass = cn("px-3 whitespace-nowrap align-middle", density === "compact" ? "py-1" : "py-2");
  const trClass = cn("border-b border-border/50 transition-colors hover:bg-[var(--bg-hover)]", rowHeight || (density === "compact" ? "h-[32px]" : "h-[44px]"));

  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-[var(--card-bg)] overflow-auto max-h-[calc(100vh-220px)] relative group/table">
      <button 
        onClick={() => setDensity(d => d === "compact" ? "normal" : "compact")}
        className="absolute top-1.5 right-2 z-20 p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover/table:opacity-100 transition-opacity bg-[var(--card-bg)]/80 backdrop-blur"
        title="Toggle Row Density"
      >
        <LayoutList size={14} />
      </button>
      <table className={cn("w-full text-left border-collapse min-w-max", className)}>
        <thead className="sticky top-0 z-10 bg-[var(--table-header)] shadow-sm">
          <tr className="border-b-2 border-border text-[11px] font-medium text-secondary-foreground uppercase tracking-wider h-[36px]">
            {columns ? (
              columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width, textAlign: col.align || "left" }}
                  onClick={() => col.sortable && setSort(p =>
                    p?.key === col.key
                      ? { key: col.key, dir: p.dir === "asc" ? "desc" : "asc" }
                      : { key: col.key, dir: "asc" }
                  )}
                  className={cn(
                    thClass,
                    col.sortable && "cursor-pointer select-none hover:text-[var(--text-primary)]"
                  )}
                >
                  <span className={cn("flex items-center gap-1", col.align === "right" && "justify-end", col.align === "center" && "justify-center")}>
                    {col.header}
                    {col.sortable && sort?.key === col.key && (
                      <span className="text-[var(--accent)]">{sort.dir === "asc" ? "↑" : "↓"}</span>
                    )}
                    {col.sortable && sort?.key !== col.key && (
                      <span className="text-[var(--text-muted)] opacity-40">↕</span>
                    )}
                  </span>
                </th>
              ))
            ) : headers ? (
              headers.map((h, i) => (
                <th key={i} className={thClass}>
                  {h}
                </th>
              ))
            ) : null}
          </tr>
        </thead>
        <tbody className="text-sm">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className={trClass}>
                {(columns || headers || []).map((_, j) => (
                  <td key={j} className="px-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : isEmpty || (!children && (!data || data.length === 0)) ? (
            <tr>
              <td colSpan={(columns || headers || []).length} className="h-40 text-center align-middle">
                <div className="flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                  <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
                    <FolderSearch className="w-6 h-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">No results found</p>
                  <p className="text-xs opacity-70 max-w-[250px]">Try adjusting your filters or search terms to find what you're looking for.</p>
                </div>
              </td>
            </tr>
          ) : columns && data ? (
            sortedData.map((row, i) => (
              <tr key={i} className={trClass}>
                {columns.map(col => (
                  <td key={col.key} className="px-3" style={{ textAlign: col.align || "left" }}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

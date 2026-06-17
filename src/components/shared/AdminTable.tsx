import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AdminTableProps {
  headers: ReactNode[]
  children: ReactNode
  className?: string
  isEmpty?: boolean
  isLoading?: boolean
}

export default function AdminTable({ headers, children, className, isEmpty, isLoading }: AdminTableProps) {
  return (
    <div className="rounded-[var(--card-radius)] border border-border bg-card overflow-auto max-h-[calc(100vh-220px)] relative">
      <table className={cn("w-full text-left border-collapse min-w-max", className)}>
        <thead className="sticky top-0 z-10 bg-card shadow-sm">
          <tr className="border-b border-border bg-elevated/80 text-[11px] font-medium text-secondary-foreground uppercase tracking-wider h-[36px]">
            {headers.map((h, i) => (
              <th key={i} className="px-3 whitespace-nowrap align-middle">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-b border-border/50 h-[40px]">
                {headers.map((_, j) => (
                  <td key={j} className="px-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : isEmpty ? (
            <tr>
              <td colSpan={headers.length} className="h-20 text-center text-muted-foreground align-middle">
                No data available
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

import { cn } from "@/lib/utils";

interface BudgetRow {
  username:  string;
  budget:    number;
  remaining: number;
  used:      number;
  pct:       number;
}

export const BudgetHealthBars = ({ data }: { data: BudgetRow[] }) => (
  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
    {data.length === 0 && (
      <p className="text-xs text-[var(--text-muted)] text-center py-4">No active keys</p>
    )}
    {data.map(row => {
      const color =
        row.pct >= 70 ? "bg-[var(--success)]" :
        row.pct >= 30 ? "bg-[var(--warning)]" :
                        "bg-[var(--error)]";
      const textColor =
        row.pct >= 70 ? "text-[var(--success)]" :
        row.pct >= 30 ? "text-[var(--warning)]" :
                        "text-[var(--error)]";

      return (
        <div key={row.username}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-[var(--text-secondary)] font-medium truncate max-w-[180px]">
              {row.username}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] text-[var(--text-muted)]">
                {row.used.toFixed(0)}s used
              </span>
              <span className={cn("text-[10px] font-semibold font-mono w-10 text-right", textColor)}>
                {row.pct.toFixed(0)}%
              </span>
              <span className="text-[10px] text-[var(--text-muted)] w-20 text-right">
                {row.remaining.toFixed(2)}s left
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", color)}
              style={{ width: `${Math.max(row.pct, 0.5)}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);

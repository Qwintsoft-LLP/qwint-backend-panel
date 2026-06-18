import { ApiKey } from "@/hooks/useApiKeys";

export const BudgetHealthChart = ({ keys }: { keys: ApiKey[] }) => {
  const top10 = [...keys]
    .filter(k => k.is_active)
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 10);

  return (
    <div className="space-y-2">
      {top10.map(k => {
        const budget = Number(k.budget) || 0;
        const remaining = Number(k.remaining_budget) || 0;
        const pct = budget > 0 ? (remaining / budget) * 100 : 0;
        const color = pct >= 70 ? "var(--success)" : pct >= 30 ? "var(--warning)" : "var(--error)";
        return (
          <div key={k.key} className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-secondary)] truncate max-w-[100px]">{k.username}</span>
              <span className="font-mono text-[var(--text-muted)]">{remaining.toFixed(0)} sec</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

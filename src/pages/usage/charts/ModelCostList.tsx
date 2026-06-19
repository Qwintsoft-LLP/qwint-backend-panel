const fmtTok = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

export const ModelCostList = ({ data }: { data: { model: string; tokens: number; cost: number }[] }) => {
  if (!data.length) return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)] text-center px-4">
      No model cost data — connect Langfuse
    </div>
  );
  const maxCost = Math.max(...data.map(d => d.cost));
  return (
    <div className="space-y-2.5 overflow-y-auto pr-2" style={{ maxHeight: "100%" }}>
      {data.map(row => (
        <div key={row.model}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-primary)] font-medium truncate pr-2">{row.model}</span>
            <span className="font-mono text-[var(--text-secondary)] whitespace-nowrap">${row.cost.toFixed(5)}</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all"
              style={{ width: `${maxCost > 0 ? (row.cost / maxCost) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{fmtTok(row.tokens)} tokens</p>
        </div>
      ))}
    </div>
  );
};

import type { ModelCostRow } from "@/hooks/useLangfuseDashboardData";

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

interface Props {
  rows: ModelCostRow[];
  totalCost: number;
  loading?: boolean;
}

export const ModelCostsWidget = ({ rows, totalCost, loading }: Props) => {
  return (
    <div>
      {/* Total cost header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-md bg-[var(--success)]/10">
          <svg className="w-4 h-4 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          {loading ? (
            <div className="h-6 w-24 bg-[var(--bg-elevated)] rounded animate-pulse" />
          ) : (
            <p className="text-xl font-bold font-mono text-[var(--text-primary)] leading-none">
              ${totalCost.toFixed(4)}
            </p>
          )}
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Total LLM cost</p>
        </div>
      </div>

      {/* Model breakdown table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-[var(--text-muted)] border-b border-[var(--border)]">
              <th className="text-left py-1.5 font-medium">Model</th>
              <th className="text-right py-1.5 font-medium">Tokens</th>
              <th className="text-right py-1.5 font-medium">Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-[var(--text-muted)] text-xs">
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-[var(--bg-elevated)] rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-[var(--bg-elevated)] rounded animate-pulse" />
                  </div>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.providedModelName}
                className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--bg-hover)] transition-colors"
              >
                <td className="py-2 font-mono text-[11px] text-[var(--text-primary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    {row.providedModelName}
                  </span>
                </td>
                <td className="py-2 text-right text-[11px] text-[var(--text-secondary)] font-mono">
                  {fmtTokens(row.totalTokens)}
                </td>
                <td className="py-2 text-right text-[11px] text-[var(--text-secondary)] font-mono">
                  ${row.totalCost?.toFixed(6)}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-[var(--text-muted)] text-xs">
                  No model usage data in this range
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

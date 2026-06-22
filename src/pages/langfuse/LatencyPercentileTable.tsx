import type { LatencyRow } from "@/hooks/useLatencyPercentiles";

function fmt(s: number) {
  if (s <= 0) return "—";
  if (s < 1) return `${(s * 1000).toFixed(0)}ms`;
  return `${s.toFixed(2)}s`;
}

function getLatencyColor(seconds: number) {
  if (seconds <= 0) return "text-[var(--text-muted)]";
  if (seconds < 1)  return "text-[var(--success)]";
  if (seconds < 3)  return "text-[var(--warning)]";
  return "text-[var(--error)]";
}

export const LatencyPercentileTable = ({
  rows,
  loading,
  emptyMessage = "No latency data",
}: {
  rows: LatencyRow[];
  loading?: boolean;
  emptyMessage?: string;
}) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-7 bg-[var(--bg-elevated)] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-[var(--text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] text-[var(--text-muted)] border-b border-[var(--border)]">
            <th className="text-left py-1.5 font-medium">Name</th>
            <th className="text-right py-1.5 font-medium">p50</th>
            <th className="text-right py-1.5 font-medium">p90</th>
            <th className="text-right py-1.5 font-medium">p95</th>
            <th className="text-right py-1.5 font-medium">p99</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.name}
              className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--bg-hover)] transition-colors"
            >
              <td className="py-1.5 font-mono text-[11px] text-[var(--text-primary)] truncate max-w-[140px]">
                {r.name}
              </td>
              <td className={`py-1.5 text-right font-mono text-[11px] ${getLatencyColor(r.p50)}`}>
                {fmt(r.p50)}
              </td>
              <td className={`py-1.5 text-right font-mono text-[11px] ${getLatencyColor(r.p90)}`}>
                {fmt(r.p90)}
              </td>
              <td className={`py-1.5 text-right font-mono text-[11px] ${getLatencyColor(r.p95)}`}>
                {fmt(r.p95)}
              </td>
              <td className={`py-1.5 text-right font-mono text-[11px] ${getLatencyColor(r.p99)}`}>
                {fmt(r.p99)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

import { cn } from "@/lib/utils";
import { DollarSign, Clock, Hash, Layers } from "lucide-react";

interface Props {
  traces:      number;
  totalCost:   number;
  avgLatency:  number;   // seconds
  totalTokens: number;
  loading:     boolean;
}

export const LangfuseKpis = ({ traces, totalCost, avgLatency, totalTokens, loading }: Props) => {
  const items = [
    {
      icon:  <Layers size={14} />,
      label: "Total Traces",
      value: traces.toLocaleString(),
      sub:   "all time for this key",
    },
    {
      icon:  <DollarSign size={14} />,
      label: "Total LLM Cost",
      value: `$${totalCost.toFixed(4)}`,
      sub:   "last 30 days",
    },
    {
      icon:  <Clock size={14} />,
      label: "Avg Latency",
      value: avgLatency > 0 ? `${(avgLatency * 1000).toFixed(0)}ms` : "—",
      sub:   "per trace",
    },
    {
      icon:  <Hash size={14} />,
      label: "Total Tokens",
      value: totalTokens > 0
        ? totalTokens >= 1_000_000
          ? `${(totalTokens / 1_000_000).toFixed(1)}M`
          : totalTokens >= 1_000
          ? `${(totalTokens / 1_000).toFixed(1)}K`
          : totalTokens.toLocaleString()
        : "0",
      sub:   "last 30 days",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--bg-surface)]">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex items-start gap-3 px-4 py-3 transition-colors",
            i < items.length - 1 && "border-r border-[var(--border)]",
            i >= 2 && "border-t border-[var(--border)] md:border-t-0",
          )}
        >
          <div className="mt-0.5 p-1.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] shrink-0">
            {item.icon}
          </div>
          {loading ? (
            <div className="space-y-2 flex-1">
              <div className="h-5 w-16 bg-[var(--bg-elevated)] rounded animate-pulse" />
              <div className="h-3 w-24 bg-[var(--bg-elevated)] rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold font-mono text-[var(--text-primary)] leading-none">
                {item.value}
              </p>
              <p className="text-[11px] font-medium text-[var(--text-secondary)] mt-0.5">{item.label}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{item.sub}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

import { Zap, Hash, ArrowLeftRight, DollarSign, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  totalCredits:  number;
  totalRequests: number;
  tokenStats:    { input: number; output: number; total: number; cost: number };
  loading: boolean;
}

const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(2)}K`
  : n.toLocaleString();

export const UsageKpis = ({ totalCredits, totalRequests, tokenStats, loading }: Props) => {
  const items = [
    {
      icon: <Zap size={14} />,
      label: "Total Credits Used",
      value: totalCredits.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      sub:   `across ${totalRequests.toLocaleString()} requests`,
    },
    {
      icon: <Hash size={14} />,
      label: "Total Tokens",
      value: fmtNum(tokenStats.total),
      sub:   "input + output",
    },
    {
      icon: <ArrowLeftRight size={14} />,
      label: "Input / Output Split",
      value: `${fmtNum(tokenStats.input)} / ${fmtNum(tokenStats.output)}`,
      sub:   `${((tokenStats.input / (tokenStats.total || 1)) * 100).toFixed(0)}% input`,
    },
    {
      icon: <DollarSign size={14} />,
      label: "Est. LLM Cost",
      value: `$${tokenStats.cost.toFixed(4)}`,
      sub:   "USD, model provider cost",
    },
    {
      icon: <Activity size={14} />,
      label: "Avg Credits / Request",
      value: totalRequests > 0 ? (totalCredits / totalRequests).toFixed(2) : "0",
      sub:   "efficiency indicator",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border border-[var(--card-border)] rounded-md overflow-hidden bg-[var(--card-bg)] admin-card">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex items-start gap-2.5 px-3 py-3",
            i < items.length - 1 && "border-r border-[var(--border)]",
            i >= 2 && "border-t md:border-t-0 border-[var(--border)]"
          )}
        >
          <div className="mt-0.5 text-[var(--accent)] opacity-70 shrink-0">{item.icon}</div>
          {loading
            ? <div className="space-y-1.5 w-full">
                <div className="h-5 w-16 bg-[var(--bg-elevated)] rounded animate-pulse" />
                <div className="h-3 w-20 bg-[var(--bg-elevated)] rounded animate-pulse" />
              </div>
            : <div className="min-w-0">
                <p className="text-lg font-bold font-mono text-[var(--text-primary)] leading-tight truncate">
                  {item.value}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{item.sub}</p>
              </div>
          }
        </div>
      ))}
    </div>
  );
};

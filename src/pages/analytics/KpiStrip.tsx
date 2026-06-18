import { TrendingUp, AlertTriangle, Clock, Zap, Key, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPI {
  label:     string;
  value:     string | number;
  sub?:      string;
  icon:      React.ReactNode;
  tone?:     "normal" | "good" | "bad" | "warn";
}

const TONE_COLORS: Record<string, string> = {
  normal: "text-[var(--text-primary)]",
  good:   "text-[var(--success)]",
  bad:    "text-[var(--error)]",
  warn:   "text-[var(--warning)]",
};

export const KpiStrip = ({ kpis: data }: {
  kpis: {
    total: number;
    errors: number;
    successRate: string;
    totalCredits: number;
    avgDuration: number;
    p95Duration: number;
    uniqueKeys: number;
  }
}) => {
  const items: KPI[] = [
    {
      label: "Total Requests",
      value: data.total.toLocaleString(),
      icon:  <TrendingUp size={13} />,
      tone:  "normal",
    },
    {
      label: "Errors",
      value: data.errors.toLocaleString(),
      sub:   `of ${data.total} requests`,
      icon:  <AlertTriangle size={13} />,
      tone:  data.errors === 0 ? "good" : data.errors > data.total * 0.1 ? "bad" : "warn",
    },
    {
      label: "Success Rate",
      value: `${data.successRate}%`,
      icon:  <CheckCircle2 size={13} />,
      tone:  +data.successRate >= 99 ? "good" : +data.successRate >= 95 ? "warn" : "bad",
    },
    {
      label: "Credits Used",
      value: data.totalCredits.toFixed(1),
      sub:   "in selected range",
      icon:  <Zap size={13} />,
      tone:  "normal",
    },
    {
      label: "Avg Response",
      value: `${data.avgDuration}ms`,
      sub:   `p95: ${data.p95Duration}ms`,
      icon:  <Clock size={13} />,
      tone:  data.avgDuration < 300 ? "good" : data.avgDuration < 1000 ? "warn" : "bad",
    },
    {
      label: "Active Keys",
      value: data.uniqueKeys,
      sub:   "in selected range",
      icon:  <Key size={13} />,
      tone:  "normal",
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-0 border border-[var(--border)] rounded-md overflow-hidden bg-[var(--bg-surface)]">
      {items.map((kpi, i) => (
        <div
          key={kpi.label}
          className={cn(
            "flex items-start gap-2.5 px-3 py-2.5",
            i < items.length - 1 && "border-r border-[var(--border)]",
            i >= 3 && "border-t md:border-t-0 border-[var(--border)]"
          )}
        >
          <div className={cn("mt-0.5 opacity-60", TONE_COLORS[kpi.tone ?? "normal"])}>
            {kpi.icon}
          </div>
          <div className="min-w-0">
            <p className={cn("text-base font-semibold font-mono leading-tight", TONE_COLORS[kpi.tone ?? "normal"])}>
              {kpi.value}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{kpi.label}</p>
            {kpi.sub && (
              <p className="text-[10px] text-[var(--text-muted)] truncate">{kpi.sub}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

import { cn } from "@/lib/utils";

interface Props {
  title: string; subtitle?: string; children: React.ReactNode;
  height?: number | "auto"; loading?: boolean; className?: string;
}

export const UsageCard = ({ title, subtitle, children, height = 240, loading, className }: Props) => (
  <div className={cn("border border-[var(--card-border)] rounded-md bg-[var(--card-bg)] admin-card p-3 flex flex-col", className)}>
    <div className="mb-3 shrink-0">
      <p className="text-xs font-semibold text-[var(--text-primary)]">{title}</p>
      {subtitle && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
    </div>
    <div className="flex-1 min-h-0" style={{ height: height === "auto" ? undefined : height }}>
      {loading
        ? <div className="w-full h-full bg-[var(--bg-elevated)] rounded animate-pulse" />
        : children}
    </div>
  </div>
);

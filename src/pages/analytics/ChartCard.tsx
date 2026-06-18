import { cn } from "@/lib/utils";

interface ChartCardProps {
  title:       string;
  subtitle?:   string;
  children:    React.ReactNode;
  className?:  string;
  height?:     number | "auto";    // chart height in px (not card height)
  loading?:    boolean;
  empty?:      boolean;
  emptyMsg?:   string;
  action?:     React.ReactNode;
}

export const ChartCard = ({
  title, subtitle, children, className,
  height = 220, loading, empty, emptyMsg, action,
}: ChartCardProps) => (
  <div className={cn(
    "border border-[var(--border)] rounded-md bg-[var(--bg-surface)] p-3 admin-card",
    className
  )}>
    {/* Header */}
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)]">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>

    {/* Body */}
    <div style={{ height }}>
      {loading ? (
        <div className="w-full h-full bg-[var(--bg-elevated)] rounded animate-pulse" />
      ) : empty ? (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-xs text-[var(--text-muted)]">{emptyMsg ?? "No data in this range"}</p>
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);

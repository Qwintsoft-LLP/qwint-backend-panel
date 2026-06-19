import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import CopyField from "@/components/shared/CopyField";
import { ObservationTree } from "./ObservationTree";
import type { LfTrace } from "@/api/langfuse";

interface Props {
  traces:  LfTrace[];
  loading: boolean;
  page:    number;
  total:   number;
  onPage:  (p: number) => void;
}

export const TracesTable = ({ traces, loading, page, total, onPage }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return (
    <div className="space-y-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 bg-[var(--bg-elevated)] rounded animate-pulse" />
      ))}
    </div>
  );

  if (!traces.length) return (
    <div className="h-24 flex items-center justify-center text-xs text-[var(--text-muted)]">
      No traces found for this key in the recent window
    </div>
  );

  const COLS = ["", "Trace Name / ID", "Session (reqc-id)", "Timestamp", "Latency", "Tokens", "Cost"];

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[32px_1fr_160px_100px_80px_80px_80px] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-t-md">
        {COLS.map((h, i) => (
          <div key={i} className={cn(
            "px-3 h-9 flex items-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]",
            i > 0 && "border-l border-[var(--border)]",
            i >= 4 && "justify-end",
          )}>
            {h}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="border-x border-b border-[var(--border)] rounded-b-md overflow-hidden">
        {traces.map((trace, idx) => {
          const isExpanded = expandedId === trace.id;
          return (
            <div key={trace.id}>
              {/* Row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : trace.id)}
                className={cn(
                  "grid grid-cols-[32px_1fr_160px_100px_80px_80px_80px] cursor-pointer transition-colors",
                  "border-t border-[var(--border)]/50 hover:bg-[var(--bg-hover)]",
                  isExpanded && "bg-[var(--bg-hover)]",
                  idx === 0 && "border-t-0",
                )}
              >
                {/* Toggle */}
                <div className="flex items-center justify-center h-10 text-[var(--text-muted)]">
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </div>

                {/* Name + ID */}
                <div className="px-3 h-10 flex flex-col justify-center border-l border-[var(--border)]/50 min-w-0">
                  <span className="text-xs text-[var(--text-primary)] font-medium truncate">
                    {trace.name ?? "—"}
                  </span>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono truncate" onClick={e => e.stopPropagation()}>
                    <CopyField value={trace.id} />
                  </div>
                </div>

                {/* Session ID */}
                <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50" onClick={e => e.stopPropagation()}>
                  {trace.sessionId
                    ? <div className="text-[10px] font-mono text-[var(--text-secondary)] truncate"><CopyField value={trace.sessionId} /></div>
                    : <span className="text-[10px] text-[var(--text-muted)]">—</span>
                  }
                </div>

                {/* Timestamp */}
                <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
                  <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                    {format(parseISO(trace.timestamp), "MMM d HH:mm:ss")}
                  </span>
                </div>

                {/* Latency */}
                <div className="px-3 h-10 flex items-center justify-end border-l border-[var(--border)]/50">
                  <span className={cn(
                    "text-xs font-mono",
                    trace.latency == null           ? "text-[var(--text-muted)]"  :
                    trace.latency < 1               ? "text-[var(--success)]"     :
                    trace.latency < 3               ? "text-[var(--warning)]"     :
                                                      "text-[var(--error)]"
                  )}>
                    {trace.latency != null ? `${(trace.latency * 1000).toFixed(0)}ms` : "—"}
                  </span>
                </div>

                {/* Tokens */}
                <div className="px-3 h-10 flex items-center justify-end border-l border-[var(--border)]/50">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {trace.usage?.total?.toLocaleString() ?? "—"}
                  </span>
                </div>

                {/* Cost */}
                <div className="px-3 h-10 flex items-center justify-end border-l border-[var(--border)]/50">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {trace.totalCost != null ? `$${trace.totalCost.toFixed(5)}` : "—"}
                  </span>
                </div>
              </div>

              {/* Observation tree (expanded) */}
              {isExpanded && (
                <div className="border-t border-[var(--accent)]/20 bg-[var(--bg-elevated)]/40">
                  <ObservationTree traceId={trace.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-[11px] text-[var(--text-muted)]">
          {total.toLocaleString()} total traces
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors"
          >
            ← Prev
          </button>
          <span className="px-2 text-xs text-[var(--text-muted)]">Page {page}</span>
          <button
            onClick={() => onPage(page + 1)}
            disabled={traces.length < 20}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};

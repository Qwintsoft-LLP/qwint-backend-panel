import { useQuery } from "@tanstack/react-query";
import { langfuseApi, type LfObservation } from "@/api/langfuse";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronRight, ChevronDown, Zap, Box, Circle } from "lucide-react";

// ── Icons per observation type ────────────────────────────────────────────
const OBS_ICON = {
  GENERATION: <Zap size={11} className="text-[var(--accent)]" />,
  SPAN:       <Box size={11} className="text-[var(--info)]" />,
  EVENT:      <Circle size={11} className="text-[var(--warning)]" />,
};

const OBS_BADGE: Record<string, string> = {
  GENERATION: "text-[var(--accent)]  border-[var(--accent)]/30  bg-[var(--accent)]/5",
  SPAN:       "text-[var(--info)]    border-[var(--info)]/30    bg-[var(--info)]/5",
  EVENT:      "text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/5",
};

// ── Smart I/O renderer ────────────────────────────────────────────────────
const IoBlock = ({ value }: { value: unknown }) => {
  // OpenAI-style messages array
  if (Array.isArray(value) && (value as { role?: string }[])[0]?.role) {
    return (
      <div className="space-y-1">
        {(value as { role: string; content: string }[]).map((msg, i) => (
          <div key={i} className={cn(
            "rounded px-2.5 py-1.5 text-[10px]",
            msg.role === "assistant"
              ? "bg-[var(--accent)]/10 border border-[var(--accent)]/20"
              : "bg-[var(--bg-elevated)] border border-[var(--border)]"
          )}>
            <span className={cn(
              "font-semibold uppercase text-[9px] tracking-wide mr-2",
              msg.role === "assistant"
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)]"
            )}>
              {msg.role}
            </span>
            <span className="text-[var(--text-secondary)] whitespace-pre-wrap">{msg.content}</span>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "string") return (
    <pre className="text-[10px] font-mono bg-[var(--bg-elevated)] border border-[var(--border)] rounded p-2 overflow-auto max-h-40 text-[var(--text-secondary)] whitespace-pre-wrap">
      {value}
    </pre>
  );

  return (
    <pre className="text-[10px] font-mono bg-[var(--bg-elevated)] border border-[var(--border)] rounded p-2 overflow-auto max-h-40 text-[var(--text-secondary)] whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};

// ── Single observation row ────────────────────────────────────────────────
const ObservationRow = ({ obs }: { obs: LfObservation }) => {
  const [expanded, setExpanded] = useState(false);
  const hasIO   = obs.input != null || obs.output != null;
  const latMs   = obs.endTime && obs.startTime
    ? new Date(obs.endTime).getTime() - new Date(obs.startTime).getTime()
    : null;

  return (
    <div>
      <div
        className={cn(
          "flex items-start gap-2 px-4 py-2 transition-colors",
          hasIO ? "cursor-pointer hover:bg-[var(--bg-hover)]" : "cursor-default",
          expanded && "bg-[var(--bg-hover)]"
        )}
        onClick={() => hasIO && setExpanded(p => !p)}
      >
        {/* Toggle icon */}
        <div className="mt-0.5 w-4 shrink-0 text-[var(--text-muted)]">
          {hasIO ? (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />) : <span className="w-4 inline-block" />}
        </div>

        {/* Type badge + name + model */}
        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
          {OBS_ICON[obs.type] ?? OBS_ICON.EVENT}
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", OBS_BADGE[obs.type] ?? OBS_BADGE.EVENT)}>
            {obs.type}
          </span>
          <span className="text-xs text-[var(--text-primary)] truncate font-medium">
            {obs.name ?? "unnamed"}
          </span>
          {obs.model && (
            <span className="text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] shrink-0">
              {obs.model}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 shrink-0 text-[10px] font-mono">
          {latMs != null && (
            <span className={latMs < 1000 ? "text-[var(--success)]" : latMs < 3000 ? "text-[var(--warning)]" : "text-[var(--error)]"}>
              {latMs}ms
            </span>
          )}
          {obs.usage?.total != null && (
            <span className="text-[var(--text-muted)]">{obs.usage.total.toLocaleString()} tok</span>
          )}
          {obs.usage?.totalCost != null && (
            <span className="text-[var(--text-secondary)]">${obs.usage.totalCost.toFixed(5)}</span>
          )}
        </div>
      </div>

      {/* Expanded: input / output / params */}
      {expanded && (
        <div className="px-10 pb-3 space-y-2 border-t border-[var(--border)]/30 bg-[var(--bg-elevated)]/40">
          {obs.input != null && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 mt-2">Input</p>
              <IoBlock value={obs.input} />
            </div>
          )}
          {obs.output != null && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Output</p>
              <IoBlock value={obs.output} />
            </div>
          )}
          {obs.modelParameters && Object.keys(obs.modelParameters).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">Model Parameters</p>
              <pre className="text-[10px] font-mono bg-[var(--bg-elevated)] border border-[var(--border)] rounded p-2 overflow-auto max-h-24 text-[var(--text-secondary)]">
                {JSON.stringify(obs.modelParameters, null, 2)}
              </pre>
            </div>
          )}
          {obs.statusMessage && (
            <p className="text-[10px] text-[var(--error)] mt-1">{obs.statusMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main component — fetches observations when mounted ────────────────────
export const ObservationTree = ({ traceId }: { traceId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["lf-obs", traceId],
    queryFn:  () => langfuseApi.observationsByTrace(traceId),
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) return (
    <div className="px-4 py-3 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-8 bg-[var(--bg-elevated)] rounded animate-pulse" />
      ))}
    </div>
  );

  const observations = data?.data ?? [];

  if (!observations.length) return (
    <div className="px-4 py-3 text-[11px] text-[var(--text-muted)]">
      No observations in this trace
    </div>
  );

  const genCount = observations.filter(o => o.type === "GENERATION").length;
  const totTokens = observations.reduce((s, o) => s + (o.usage?.total ?? 0), 0);
  const totCost   = observations.reduce((s, o) => s + (o.usage?.totalCost ?? 0), 0);

  return (
    <div className="divide-y divide-[var(--border)]/30">
      {/* Summary */}
      <div className="flex items-center gap-3 px-4 py-2 text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)]/60">
        <span>{observations.length} observations</span>
        <span>·</span>
        <span>{genCount} LLM calls</span>
        <span>·</span>
        <span>{totTokens.toLocaleString()} tokens</span>
        <span>·</span>
        <span>${totCost.toFixed(5)} cost</span>
      </div>
      {observations.map(obs => <ObservationRow key={obs.id} obs={obs} />)}
    </div>
  );
};

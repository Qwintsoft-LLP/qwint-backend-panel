import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { langfuseApi } from "@/api/langfuse";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ObservationTree } from "./ObservationTree";
import { format, parseISO } from "date-fns";

export const SessionLookup = () => {
  const [reqcId, setReqcId]       = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lf-session", submitted],
    queryFn:  () => langfuseApi.tracesBySession(submitted),
    enabled:  !!submitted,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const handleSubmit = () => {
    const trimmed = reqcId.trim();
    if (trimmed) setSubmitted(trimmed);
  };

  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">
        Lookup by Request ID (reqc-id)
        <span className="ml-2 font-normal text-[var(--text-muted)]">
          — enter a reqc-xxx ID to see all LLM calls triggered by that request
        </span>
      </p>
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="reqc-071b45..."
          value={reqcId}
          onChange={e => setReqcId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          className="h-8 text-sm font-mono bg-[var(--bg-elevated)] border-[var(--border)]"
        />
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs shrink-0"
          onClick={handleSubmit}
          disabled={!reqcId.trim() || isLoading}
        >
          <Search size={12} />
          {isLoading ? "Searching..." : "Find Traces"}
        </Button>
      </div>

      {isError && (
        <p className="text-xs text-[var(--error)]">
          Failed to fetch — check Langfuse config in Settings
        </p>
      )}

      {data && data.data.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          No traces found for session "{submitted}"
        </p>
      )}

      {data && data.data.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--text-muted)]">
            {data.data.length} trace(s) found in session
          </p>
          {data.data.map(trace => (
            <div key={trace.id} className="border border-[var(--border)] rounded-md overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                <div>
                  <span className="text-xs font-medium text-[var(--text-primary)]">
                    {trace.name ?? "trace"}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] ml-2 font-mono">
                    {trace.id.slice(0, 16)}...
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-[var(--text-muted)]">
                    {format(parseISO(trace.timestamp), "MMM d HH:mm:ss")}
                  </span>
                  {trace.latency != null && (
                    <span className="text-[var(--text-secondary)]">
                      {(trace.latency * 1000).toFixed(0)}ms
                    </span>
                  )}
                  {trace.totalCost != null && (
                    <span className="text-[var(--text-secondary)]">
                      ${trace.totalCost.toFixed(5)}
                    </span>
                  )}
                </div>
              </div>
              <ObservationTree traceId={trace.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

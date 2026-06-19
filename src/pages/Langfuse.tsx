import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FlaskConical } from "lucide-react";
import { langfuseApi } from "@/api/langfuse";
import { getLangfuseSettings } from "@/lib/storage";
import { KeySelector }    from "./langfuse/KeySelector";
import { LangfuseKpis }   from "./langfuse/LangfuseKpis";
import { DailyCostChart } from "./langfuse/DailyCostChart";
import { ModelUsagePie }  from "./langfuse/ModelUsagePie";
import { TracesTable }    from "./langfuse/TracesTable";
import { SessionLookup }  from "./langfuse/SessionLookup";

// ── Simple chart card shell ────────────────────────────────────────────────
function ChartCard({
  title, subtitle, children, loading, empty, height = 220, className = ""
}: {
  title: string; subtitle?: string; children: React.ReactNode;
  loading?: boolean; empty?: boolean; height?: number; className?: string;
}) {
  return (
    <div className={`border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4 ${className}`}>
      <p className="text-xs font-semibold text-[var(--text-primary)]">{title}</p>
      {subtitle && <p className="text-[10px] text-[var(--text-muted)] mt-0.5 mb-3">{subtitle}</p>}
      <div style={{ height }} className="mt-2">
        {loading
          ? <div className="h-full bg-[var(--bg-elevated)] rounded animate-pulse" />
          : empty
          ? <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">No data in this range</div>
          : children
        }
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function LangfusePage() {
  const [params, setParams] = useSearchParams();

  const initialKey     = params.get("key")     ?? "";

  const [selectedKey, setSelectedKey] = useState(initialKey);
  const [tracePage, setTracePage]     = useState(1);

  const handleKeyChange = (key: string) => {
    setSelectedKey(key);
    setTracePage(1);
    setParams(key ? { key } : {}, { replace: true });
  };

  const { host }            = getLangfuseSettings();
  const langfuseConfigured  = !!getLangfuseSettings().publicKey;

  // ── Queries (only fire when key is selected + Langfuse is configured) ───
  const { data: tracesData, isLoading: tracesLoading } = useQuery({
    queryKey: ["lf-traces", selectedKey, tracePage],
    queryFn:  () => langfuseApi.tracesByKey(selectedKey, tracePage, 20),
    enabled:  !!selectedKey && langfuseConfigured,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ["lf-daily", selectedKey],
    queryFn:  () => langfuseApi.dailyMetrics(selectedKey, 30),
    enabled:  !!selectedKey && langfuseConfigured,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const traces      = tracesData?.data ?? [];
    const daily       = dailyData?.data  ?? [];
    const total       = tracesData?.meta.totalItems ?? 0;
    const withLatency = traces.filter(t => t.latency);
    const avgLat      = withLatency.length
      ? withLatency.reduce((s, t) => s + (t.latency ?? 0), 0) / withLatency.length
      : 0;
    const totalCost   = daily.reduce((s, d) => s + d.totalCost, 0);
    const totalTokens = daily.reduce((s, d) =>
      s + d.usage.reduce((u, m) => u + m.totalUsage, 0), 0);
    return { traces: total, totalCost, avgLatency: avgLat, totalTokens };
  }, [tracesData, dailyData]);

  // ── Not configured ────────────────────────────────────────────────────────
  if (!langfuseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center border border-[var(--border)] rounded-lg bg-[var(--bg-surface)]">
        <FlaskConical size={32} className="text-[var(--text-muted)]" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Langfuse not configured</p>
        <p className="text-xs text-[var(--text-muted)] max-w-xs">
          Add your Langfuse public key, secret key, and host in Settings to view LLM traces.
        </p>
        <a href="/settings" className="text-xs text-[var(--accent)] hover:underline font-medium">
          Open Settings →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">LLM Traces</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Langfuse observability — API key traces, costs, and token usage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <KeySelector value={selectedKey} onChange={handleKeyChange} />
          {selectedKey && (
            <a
              href={`${host}/users/${encodeURIComponent(selectedKey)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors whitespace-nowrap"
              title="Open in Langfuse"
            >
              <ExternalLink size={12} />
              Open in Langfuse
            </a>
          )}
        </div>
      </div>

      {/* ── Session lookup ─────────────────────────────────────────────── */}
      <SessionLookup />

      {/* ── KPI strip ─────────────────────────────────────────────────── */}
      {selectedKey && (
        <LangfuseKpis {...kpis} loading={tracesLoading || dailyLoading} />
      )}

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      {selectedKey && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard
            title="Daily LLM Cost"
            subtitle="USD cost per day over last 30 days"
            className="lg:col-span-2"
            height={220}
            loading={dailyLoading}
            empty={!dailyData?.data.length}
          >
            <DailyCostChart data={dailyData?.data ?? []} />
          </ChartCard>

          <ChartCard
            title="Model Usage"
            subtitle="Token share by model"
            height={220}
            loading={dailyLoading}
            empty={!dailyData?.data.some(d => d.usage.length)}
          >
            <ModelUsagePie data={dailyData?.data ?? []} />
          </ChartCard>
        </div>
      )}

      {/* ── Traces table ───────────────────────────────────────────────── */}
      {selectedKey && (
        <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">
            Traces
            {tracesData?.meta.totalItems != null && (
              <span className="ml-2 font-normal text-[var(--text-muted)]">
                ({tracesData.meta.totalItems.toLocaleString()} total)
              </span>
            )}
          </p>
          <TracesTable
            traces={tracesData?.data ?? []}
            loading={tracesLoading}
            page={tracePage}
            total={tracesData?.meta.totalItems ?? 0}
            onPage={setTracePage}
          />
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!selectedKey && (
        <div className="h-48 flex flex-col items-center justify-center gap-2 text-center border border-[var(--border)] rounded-lg bg-[var(--bg-surface)]">
          <FlaskConical size={28} className="text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-muted)]">Select an API key to view its LLM traces</p>
          <p className="text-xs text-[var(--text-muted)]">
            Or use the session lookup above to find traces by reqc-id
          </p>
        </div>
      )}
    </div>
  );
}

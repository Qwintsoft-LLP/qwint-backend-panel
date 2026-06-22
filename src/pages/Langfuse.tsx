import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FlaskConical, LayoutDashboard, List } from "lucide-react";
import { getLangfuseSettings } from "@/lib/storage";
import type { Range } from "@/lib/timeRange";
import { useLangfuseDashboardData } from "@/hooks/useLangfuseDashboardData";

// New dashboard widgets (all accept data as props — no self-fetching)
import { TotalTracesWidget } from "./langfuse/TotalTracesWidget";
import { ModelCostsWidget } from "./langfuse/ModelCostsWidget";
import { ObsByTimeWidget } from "./langfuse/ObsByTimeWidget";
import { ObsByLevelWidget } from "./langfuse/ObsByLevelWidget";
import { CostByModelWidget } from "./langfuse/CostByModelWidget";
import { UserConsumptionWidget } from "./langfuse/UserConsumptionWidget";
import { LatencyPercentileTable } from "./langfuse/LatencyPercentileTable";
import { ScoresWidget } from "./langfuse/ScoresWidget";
import { UsersTab } from "./langfuse/UsersTab";

// ── Tab type ──
type Tab = "dashboard" | "users";


// ── Dashboard Tab — uses single consolidated hook ──────────────────────────
function DashboardTab({ range }: { range: Range }) {
  const { data: d, isLoading } = useLangfuseDashboardData(range);

  return (
    <div className="space-y-4">
      {/* Row 1: Traces + Model Costs + Scores / Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">Traces</p>
          <TotalTracesWidget
            totalItems={d?.totalTraces ?? 0}
            byName={d?.tracesByName ?? {}}
            loading={isLoading}
          />
        </div>

        <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">Model Costs</p>
          <ModelCostsWidget
            rows={d?.modelCostRows ?? []}
            totalCost={d?.totalCost ?? 0}
            loading={isLoading}
          />
        </div>

        <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">Scores</p>
            <ScoresWidget totalItems={d?.totalScores ?? 0} loading={isLoading} />
          </div>
          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">Observations</p>
            <ObsByLevelWidget
              totalItems={d?.totalObservations ?? 0}
              byLevel={d?.obsByLevel ?? {}}
              byType={d?.obsByType ?? {}}
              loading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Observations over time */}
      <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">Observations over time</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Hourly observation count</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-mono text-[var(--text-primary)] leading-none">
              {(d?.totalObservations ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">total</p>
          </div>
        </div>
        <div style={{ height: 200 }}>
          <ObsByTimeWidget data={d?.obsByTime ?? []} loading={isLoading} />
        </div>
      </div>

      {/* Row 3: Cost by model over time */}
      <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
        <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">Cost by model over time</p>
        <p className="text-[10px] text-[var(--text-muted)] mb-3">Stacked area chart — hourly cost per model</p>
        <div style={{ height: 220 }}>
          <CostByModelWidget
            chartData={d?.costByModelTime.chartData ?? []}
            models={d?.costByModelTime.models ?? []}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Row 4: User consumption */}
      <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
        <p className="text-xs font-semibold text-[var(--text-primary)] mb-1">User consumption</p>
        <p className="text-[10px] text-[var(--text-muted)] mb-3">Cost per API key / user</p>
        <UserConsumptionWidget data={d?.userConsumption ?? []} loading={isLoading} />
      </div>

      {/* Row 5: Latency tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">Trace latency percentiles</p>
          <LatencyPercentileTable
            rows={d?.traceLatencies ?? []}
            loading={isLoading}
            emptyMessage="No trace latency data"
          />
        </div>
        <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">Generation latency percentiles</p>
          <LatencyPercentileTable
            rows={d?.generationLatencies ?? []}
            loading={isLoading}
            emptyMessage="No generation latency data"
          />
        </div>
      </div>

      <div className="border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
        <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">Span latency percentiles</p>
        <LatencyPercentileTable
          rows={d?.spanLatencies ?? []}
          loading={isLoading}
          emptyMessage="No span latency data"
        />
      </div>
    </div>
  );
}


// ── Main page ──────────────────────────────────────────────────────────────
export default function LangfusePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "dashboard";

  const setTab = (t: Tab) => {
    setSearchParams(prev => {
      prev.set("tab", t);
      return prev;
    }, { replace: true });
  };

  const [range, setRange] = useState<Range>("7d");

  const langfuseConfigured = !!getLangfuseSettings().publicKey;

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
      {/* ── Header with tabs + range picker ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">LLM Observability</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Langfuse dashboard — traces, costs, latency, and usage analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] p-0.5">
            <button
              onClick={() => setTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${tab === "dashboard"
                  ? "bg-[var(--accent)] text-white shadow-sm font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}
            >
              <LayoutDashboard size={13} />
              Dashboard
            </button>
            <button
              onClick={() => setTab("users")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${tab === "users"
                  ? "bg-[var(--accent)] text-white shadow-sm font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                }`}
            >
              <List size={13} />
              Users
            </button>
          </div>

          {/* Range picker (dashboard only) */}
          {tab === "dashboard" && (
            <div className="flex bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)] p-0.5">
              {(["1d", "7d", "30d"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${range === r
                      ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm font-medium"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────── */}
      {tab === "dashboard" ? (
        <DashboardTab range={range} />
      ) : (
        <UsersTab />
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import { getRange, type Range } from "@/lib/timeRange";
import type { LatencyRow } from "@/hooks/useLatencyPercentiles";

// ── Percentile helper ──────────────────────────────────────────────────────
function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface ModelCostRow {
  providedModelName: string;
  totalCost: number;
  totalTokens: number;
}

export interface TimeSeriesPoint {
  time: string;
  fullTime: string;
  count: number;
}

export interface UserConsumptionRow {
  userId: string;
  totalCost: number;
  countTraces: number;
}

export interface LangfuseDashboardData {
  // Traces
  totalTraces: number;
  tracesByName: Record<string, number>;
  traceLatencies: LatencyRow[];

  // Observations
  totalObservations: number;
  obsByLevel: Record<string, number>;
  obsByType: Record<string, number>;
  obsByTime: TimeSeriesPoint[];

  // Model costs
  modelCostRows: ModelCostRow[];
  totalCost: number;

  // Cost by model over time
  costByModelTime: { chartData: Record<string, unknown>[]; models: string[] };

  // Latencies
  generationLatencies: LatencyRow[];
  spanLatencies: LatencyRow[];

  // User consumption
  userConsumption: UserConsumptionRow[];

  // Scores
  totalScores: number;
}

/**
 * Single consolidated hook that powers the entire Langfuse dashboard.
 * Makes only 3 sequential API calls (traces, observations via v2, scores)
 * and derives all widget data from those responses.
 */
export function useLangfuseDashboardData(range: Range = "7d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery<LangfuseDashboardData>({
    queryKey: ["lf-dashboard-all", range],
    queryFn: async () => {
      // ── 1. Fetch traces (single page — enough for dashboard) ─────────
      const tracesRes = await langfuseClient.get("/api/public/traces", {
        params: { fromTimestamp, toTimestamp, limit: 100, page: 1 },
      });
      const traces: any[] = tracesRes.data?.data ?? [];
      const totalTraces: number = tracesRes.data?.meta?.totalItems ?? traces.length;

      // ── 2. Fetch observations via v2 endpoint (rate-limit friendly) ──
      // Small pause to avoid burst
      await new Promise(r => setTimeout(r, 300));

      let obsPage = 1;
      const allObs: any[] = [];
      while (true) {
        const obsRes = await langfuseClient.get("/api/public/observations", {
          params: {
            fromStartTime: fromTimestamp,
            toStartTime: toTimestamp,
            limit: 100,
            page: obsPage,
          },
        });
        const items = obsRes.data?.data ?? [];
        allObs.push(...items);
        const total = obsRes.data?.meta?.totalItems ?? items.length;
        if (allObs.length >= total || items.length < 100) break;
        obsPage++;
        if (obsPage > 10) break; // safety cap
        // Small pause between pages
        await new Promise(r => setTimeout(r, 500));
      }

      // ── 3. Fetch scores count ────────────────────────────────────────
      await new Promise(r => setTimeout(r, 300));
      let totalScores = 0;
      try {
        const scoresRes = await langfuseClient.get("/api/public/scores", {
          params: { fromTimestamp, toTimestamp, limit: 1, page: 1 },
        });
        totalScores = scoresRes.data?.meta?.totalItems ?? 0;
      } catch {
        // Scores may not be available
      }

      // ═══════════════════════════════════════════════════════════════════
      // DERIVE ALL DASHBOARD DATA FROM THE TWO FETCHED DATASETS
      // ═══════════════════════════════════════════════════════════════════

      // ── Traces by name ───────────────────────────────────────────────
      const tracesByName: Record<string, number> = {};
      for (const t of traces) {
        tracesByName[t.name ?? "unknown"] = (tracesByName[t.name ?? "unknown"] ?? 0) + 1;
      }

      // ── Trace latency percentiles ────────────────────────────────────
      const traceLatByName: Record<string, number[]> = {};
      for (const t of traces) {
        const name = t.name ?? "unknown";
        if (!traceLatByName[name]) traceLatByName[name] = [];
        if (t.latency != null) traceLatByName[name].push(t.latency);
      }
      const traceLatencies: LatencyRow[] = Object.entries(traceLatByName).map(
        ([name, lats]) => ({
          name,
          p50: percentile(lats, 50),
          p90: percentile(lats, 90),
          p95: percentile(lats, 95),
          p99: percentile(lats, 99),
        })
      );

      // ── Observations by level ────────────────────────────────────────
      const obsByLevel: Record<string, number> = {};
      const obsByType: Record<string, number> = {};
      for (const o of allObs) {
        obsByLevel[o.level ?? "DEFAULT"] = (obsByLevel[o.level ?? "DEFAULT"] ?? 0) + 1;
        obsByType[o.type ?? "UNKNOWN"] = (obsByType[o.type ?? "UNKNOWN"] ?? 0) + 1;
      }

      // ── Observations by time (hourly buckets) ────────────────────────
      const byHour: Record<string, number> = {};
      for (const o of allObs) {
        const dt = new Date(o.startTime);
        dt.setMinutes(0, 0, 0);
        const key = dt.toISOString();
        byHour[key] = (byHour[key] ?? 0) + 1;
      }
      const obsByTime: TimeSeriesPoint[] = Object.entries(byHour)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, count]) => ({
          time: new Date(time).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          fullTime: time,
          count,
        }));

      // ── Model costs (from GENERATION observations) ───────────────────
      const generations = allObs.filter(o => o.type === "GENERATION");
      const byModel: Record<string, { tokens: number; cost: number }> = {};
      for (const o of generations) {
        const model = o.model ?? o.providedModelName ?? "unknown";
        if (!byModel[model]) byModel[model] = { tokens: 0, cost: 0 };
        byModel[model].tokens += o.usage?.total ?? o.usage?.totalTokens ?? 0;
        byModel[model].cost += o.calculatedTotalCost ?? o.usage?.totalCost ?? 0;
      }
      const modelCostRows: ModelCostRow[] = Object.entries(byModel)
        .map(([model, v]) => ({
          providedModelName: model,
          totalTokens: v.tokens,
          totalCost: v.cost,
        }))
        .sort((a, b) => b.totalCost - a.totalCost);
      const totalCost = modelCostRows.reduce((s, r) => s + r.totalCost, 0);

      // ── Cost by model over time ──────────────────────────────────────
      const models = new Set<string>();
      const byTimeModel: Record<string, Record<string, number>> = {};
      for (const o of generations) {
        const model = o.model ?? "unknown";
        models.add(model);
        const dt = new Date(o.startTime);
        dt.setMinutes(0, 0, 0);
        const key = dt.toISOString();
        if (!byTimeModel[key]) byTimeModel[key] = {};
        byTimeModel[key][model] =
          (byTimeModel[key][model] ?? 0) + (o.calculatedTotalCost ?? o.usage?.totalCost ?? 0);
      }
      const costByModelChartData = Object.entries(byTimeModel)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, modelCosts]) => ({
          time: new Date(time).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          ...modelCosts,
        }));

      // ── Generation latency percentiles ───────────────────────────────
      const genLatByName: Record<string, number[]> = {};
      for (const o of generations) {
        const name = o.name ?? o.model ?? "unknown";
        if (!genLatByName[name]) genLatByName[name] = [];
        if (o.startTime && o.endTime) {
          genLatByName[name].push(
            (new Date(o.endTime).getTime() - new Date(o.startTime).getTime()) / 1000
          );
        }
      }
      const generationLatencies: LatencyRow[] = Object.entries(genLatByName).map(
        ([name, lats]) => ({
          name,
          p50: percentile(lats, 50),
          p90: percentile(lats, 90),
          p95: percentile(lats, 95),
          p99: percentile(lats, 99),
        })
      );

      // ── Span latency percentiles ─────────────────────────────────────
      const spans = allObs.filter(o => o.type === "SPAN");
      const spanLatByName: Record<string, number[]> = {};
      for (const o of spans) {
        const name = o.name ?? "unknown";
        if (!spanLatByName[name]) spanLatByName[name] = [];
        if (o.startTime && o.endTime) {
          spanLatByName[name].push(
            (new Date(o.endTime).getTime() - new Date(o.startTime).getTime()) / 1000
          );
        }
      }
      const spanLatencies: LatencyRow[] = Object.entries(spanLatByName).map(
        ([name, lats]) => ({
          name,
          p50: percentile(lats, 50),
          p90: percentile(lats, 90),
          p95: percentile(lats, 95),
          p99: percentile(lats, 99),
        })
      );

      // ── User consumption ─────────────────────────────────────────────
      const byUser: Record<string, { totalCost: number; countTraces: number }> = {};
      for (const t of traces) {
        const userId = t.userId ?? "unknown";
        if (!byUser[userId]) byUser[userId] = { totalCost: 0, countTraces: 0 };
        byUser[userId].totalCost += t.totalCost ?? 0;
        byUser[userId].countTraces += 1;
      }
      const userConsumption: UserConsumptionRow[] = Object.entries(byUser)
        .filter(([userId]) => userId !== "unknown")
        .map(([userId, v]) => ({ userId, ...v }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 20);

      return {
        totalTraces,
        tracesByName,
        traceLatencies,
        totalObservations: allObs.length,
        obsByLevel,
        obsByType,
        obsByTime,
        modelCostRows,
        totalCost,
        costByModelTime: { chartData: costByModelChartData, models: Array.from(models) },
        generationLatencies,
        spanLatencies,
        userConsumption,
        totalScores,
      };
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import { getRange, type Range } from "@/lib/timeRange";

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export interface LatencyRow {
  name: string;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

/**
 * Computes latency percentiles for traces (grouped by trace name).
 */
export function useTraceLatencies(range: Range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["lf-dashboard-traceLatencies", range],
    queryFn: async () => {
      const { data } = await langfuseClient.get("/api/public/traces", {
        params: { fromTimestamp, toTimestamp, limit: 100 },
      });

      const traces: any[] = data.data ?? [];

      const byName: Record<string, number[]> = {};
      for (const t of traces) {
        const name = t.name ?? "unknown";
        if (!byName[name]) byName[name] = [];
        if (t.latency != null) byName[name].push(t.latency);
      }

      return Object.entries(byName).map(([name, latencies]): LatencyRow => ({
        name,
        p50: percentile(latencies, 50),
        p90: percentile(latencies, 90),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
      }));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Computes latency percentiles for observations (GENERATION or SPAN).
 */
export function useObservationLatencies(range: Range = "1d", type: "GENERATION" | "SPAN" = "GENERATION") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["lf-dashboard-obsLatencies", range, type],
    queryFn: async () => {
      const { data } = await langfuseClient.get("/api/public/observations", {
        params: {
          fromStartTime: fromTimestamp,
          toStartTime: toTimestamp,
          type,
          limit: 100,
        },
      });

      const obs: any[] = data.data ?? [];

      const byName: Record<string, number[]> = {};
      for (const o of obs) {
        const name = o.name ?? o.model ?? "unknown";
        if (!byName[name]) byName[name] = [];
        // latency in seconds from endTime - startTime
        if (o.startTime && o.endTime) {
          byName[name].push(
            (new Date(o.endTime).getTime() - new Date(o.startTime).getTime()) / 1000
          );
        }
      }

      return Object.entries(byName).map(([name, latencies]): LatencyRow => ({
        name,
        p50: percentile(latencies, 50),
        p90: percentile(latencies, 90),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
      }));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

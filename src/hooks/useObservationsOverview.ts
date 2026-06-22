import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import { getRange, type Range } from "@/lib/timeRange";

/**
 * Fetches total observations count and groups by level (DEFAULT, WARNING, ERROR, etc.)
 */
export function useObservationsOverview(range: Range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["lf-dashboard-observations", range],
    queryFn: async () => {
      const { data } = await langfuseClient.get("/api/public/observations", {
        params: {
          fromStartTime: fromTimestamp,
          toStartTime: toTimestamp,
          limit: 100,
          page: 1,
        },
      });

      const obs: any[] = data.data ?? [];
      const totalItems: number = data.meta?.totalItems ?? obs.length;

      const byLevel: Record<string, number> = {};
      for (const o of obs) {
        const lvl = o.level ?? "DEFAULT";
        byLevel[lvl] = (byLevel[lvl] ?? 0) + 1;
      }

      // Also group by type
      const byType: Record<string, number> = {};
      for (const o of obs) {
        const type = o.type ?? "UNKNOWN";
        byType[type] = (byType[type] ?? 0) + 1;
      }

      return { totalItems, byLevel, byType };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

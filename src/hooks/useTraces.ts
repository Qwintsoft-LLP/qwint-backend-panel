import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import { getRange, type Range } from "@/lib/timeRange";

export function useTraces(range: Range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["lf-dashboard-traces", range],
    queryFn: async () => {
      const { data } = await langfuseClient.get("/api/public/traces", {
        params: {
          fromTimestamp,
          toTimestamp,
          limit: 100,
          page: 1,
        },
      });

      const traces: any[] = data.data ?? [];
      const totalItems: number = data.meta?.totalItems ?? traces.length;

      // Group by name for bar chart
      const byName: Record<string, number> = {};
      for (const t of traces) {
        byName[t.name ?? "unknown"] = (byName[t.name ?? "unknown"] ?? 0) + 1;
      }

      return { totalItems, byName, traces };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import { getRange, type Range } from "@/lib/timeRange";

/**
 * Fetches traces and groups cost + trace count by userId (API key) to show user consumption.
 */
export function useUserConsumption(range: Range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["lf-dashboard-userConsumption", range],
    queryFn: async () => {
      let page = 1;
      const all: any[] = [];

      while (true) {
        const { data } = await langfuseClient.get("/api/public/traces", {
          params: {
            fromTimestamp,
            toTimestamp,
            limit: 100,
            page,
          },
        });
        const items = data.data ?? [];
        all.push(...items);
        if (all.length >= (data.meta?.totalItems ?? items.length) || items.length < 100) break;
        page++;
        if (page > 10) break;
      }

      // Group by userId
      const byUser: Record<string, { totalCost: number; countTraces: number }> = {};
      for (const t of all) {
        const userId = t.userId ?? "unknown";
        if (!byUser[userId]) byUser[userId] = { totalCost: 0, countTraces: 0 };
        byUser[userId].totalCost += t.totalCost ?? 0;
        byUser[userId].countTraces += 1;
      }

      return Object.entries(byUser)
        .filter(([userId]) => userId !== "unknown")
        .map(([userId, v]) => ({
          userId,
          totalCost: v.totalCost,
          countTraces: v.countTraces,
        }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 20);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

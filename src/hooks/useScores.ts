import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import { getRange, type Range } from "@/lib/timeRange";

/**
 * Fetches total scores count from the Langfuse /scores endpoint.
 */
export function useScores(range: Range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["lf-dashboard-scores", range],
    queryFn: async () => {
      try {
        const { data } = await langfuseClient.get("/api/public/scores", {
          params: { fromTimestamp, toTimestamp, limit: 1, page: 1 },
        });
        return { totalItems: data.meta?.totalItems ?? 0 };
      } catch {
        // Scores endpoint may not be available on all plans
        return { totalItems: 0 };
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

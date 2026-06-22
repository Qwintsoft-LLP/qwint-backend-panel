import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import { getRange, type Range } from "@/lib/timeRange";

/**
 * Fetches observations within the range and groups them by hour for a time-series chart.
 * Uses /observations endpoint with client-side grouping (works on both cloud & self-hosted).
 */
export function useObservationsByTime(range: Range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["lf-dashboard-obsByTime", range],
    queryFn: async () => {
      let page = 1;
      const all: any[] = [];

      while (true) {
        const { data } = await langfuseClient.get("/api/public/observations", {
          params: {
            fromStartTime: fromTimestamp,
            toStartTime: toTimestamp,
            limit: 100,
            page,
          },
        });
        const items = data.data ?? [];
        all.push(...items);
        if (all.length >= (data.meta?.totalItems ?? items.length) || items.length < 100) break;
        page++;
        // Safety limit to avoid infinite loops
        if (page > 20) break;
      }

      // Group by hour
      const byHour: Record<string, number> = {};
      for (const o of all) {
        const dt = new Date(o.startTime);
        // Round down to the hour
        dt.setMinutes(0, 0, 0);
        const key = dt.toISOString();
        byHour[key] = (byHour[key] ?? 0) + 1;
      }

      return Object.entries(byHour)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, count]) => ({
          time: new Date(time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            ...(range !== "1d" ? { month: "short", day: "numeric" } as any : {}),
          }),
          fullTime: time,
          count,
        }));
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

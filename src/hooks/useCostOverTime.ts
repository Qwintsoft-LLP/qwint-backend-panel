import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import { getRange, type Range } from "@/lib/timeRange";

/**
 * Fetches GENERATION observations and groups cost by model over time.
 * Returns data shaped for a multi-line chart: [{ time, [modelName]: cost }]
 */
export function useCostOverTime(range: Range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["lf-dashboard-costOverTime", range],
    queryFn: async () => {
      let page = 1;
      const all: any[] = [];

      while (true) {
        const { data } = await langfuseClient.get("/api/public/observations", {
          params: {
            fromStartTime: fromTimestamp,
            toStartTime: toTimestamp,
            type: "GENERATION",
            limit: 100,
            page,
          },
        });
        const items = data.data ?? [];
        all.push(...items);
        if (all.length >= (data.meta?.totalItems ?? items.length) || items.length < 100) break;
        page++;
        if (page > 20) break;
      }

      // Collect unique models
      const models = new Set<string>();

      // Group by hour + model
      const byTimeModel: Record<string, Record<string, number>> = {};
      for (const o of all) {
        const model = o.model ?? "unknown";
        models.add(model);
        const dt = new Date(o.startTime);
        dt.setMinutes(0, 0, 0);
        const key = dt.toISOString();
        if (!byTimeModel[key]) byTimeModel[key] = {};
        byTimeModel[key][model] = (byTimeModel[key][model] ?? 0) + (o.calculatedTotalCost ?? o.usage?.totalCost ?? 0);
      }

      // Pivot into chart-friendly array
      const chartData = Object.entries(byTimeModel)
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

      return { chartData, models: Array.from(models) };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

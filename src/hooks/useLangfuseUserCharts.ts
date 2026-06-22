import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";

export interface DailyUserMetric {
  date: string; // MM/DD
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  observations: number;
}

export function useLangfuseUserCharts(userId: string) {
  return useQuery({
    queryKey: ["lf-user-charts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      const toDate = new Date();

      const items: any[] = [];
      let page = 1;
      const limit = 100;

      while (true) {
        const { data } = await langfuseClient.get("/api/public/observations", {
          params: {
            userId,
            fromStartTime: fromDate.toISOString(),
            toStartTime: toDate.toISOString(),
            limit,
            page,
          },
        });

        const pageItems = data?.data || [];
        items.push(...pageItems);

        if (pageItems.length < limit) break;
        if (page > 50) break; // Safety cap to avoid infinite loops
        page++;
      }
      
      // We will create a dense array of the last 30 days to ensure continuous charts
      const dailyMetrics: Record<string, DailyUserMetric> = {};
      for (let i = 30; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = `${d.getMonth() + 1}/${d.getDate()}`;
        dailyMetrics[dStr] = {
          date: dStr,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          observations: 0,
        };
      }

      for (const row of items) {
        if (!row.startTime) continue;
        const d = new Date(row.startTime);
        const dStr = `${d.getMonth() + 1}/${d.getDate()}`;
        if (dailyMetrics[dStr]) {
          dailyMetrics[dStr].cost += Number(row.totalCost || row.calculatedTotalCost || 0);
          
          const usage = row.usage || row.usageDetails || {};
          dailyMetrics[dStr].inputTokens += Number(usage.input || row.promptTokens || 0);
          dailyMetrics[dStr].outputTokens += Number(usage.output || row.completionTokens || 0);
          dailyMetrics[dStr].totalTokens += Number(usage.total || row.totalTokens || 0);
          
          dailyMetrics[dStr].observations += 1;
        }
      }

      return Object.values(dailyMetrics);
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

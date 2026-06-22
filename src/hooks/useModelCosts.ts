import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";
import { getRange, type Range } from "@/lib/timeRange";

type ModelCostRow = {
  providedModelName: string;
  totalCost: number;
  totalTokens: number;
};

/**
 * Fetches model costs by aggregating over /observations (GENERATION type).
 * Works with both cloud and self-hosted Langfuse.
 */
export function useModelCosts(range: Range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["lf-dashboard-modelCosts", range],
    queryFn: async () => {
      // Paginate through all generation observations
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
      }

      // Aggregate by model
      const byModel: Record<string, { tokens: number; cost: number }> = {};
      for (const o of all) {
        const model = o.model ?? o.providedModelName ?? "unknown";
        if (!byModel[model]) byModel[model] = { tokens: 0, cost: 0 };
        byModel[model].tokens += o.usage?.total ?? o.usage?.totalTokens ?? 0;
        byModel[model].cost += o.calculatedTotalCost ?? o.usage?.totalCost ?? 0;
      }

      const rows: ModelCostRow[] = Object.entries(byModel)
        .map(([model, v]) => ({
          providedModelName: model,
          totalTokens: v.tokens,
          totalCost: v.cost,
        }))
        .sort((a, b) => b.totalCost - a.totalCost);

      const totalCost = rows.reduce((s, r) => s + (r.totalCost ?? 0), 0);

      return { rows, totalCost };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";

/**
 * Fetches a Langfuse user's aggregate stats.
 * Langfuse API: GET /api/public/users/:userId
 */
export function useLangfuseUser(userId: string) {
  return useQuery({
    queryKey: ["lf-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Fetch traces for timestamps and trace count
      const { data: tracesData } = await langfuseClient.get("/api/public/traces", {
        params: { userId, limit: 100 },
      });
      const traces: any[] = tracesData?.data ?? [];
      const totalTraces = tracesData?.meta?.totalItems ?? traces.length;
      const timestamps = traces.map((t: any) => t.timestamp).filter(Boolean).sort();

      // Fetch precise metrics
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90); // 90 day window for user detail

      let totalTokens = 0, inputTokens = 0, outputTokens = 0, totalCost = 0, totalObservations = 0;
      try {
        const { data: metricsResponse } = await langfuseClient.get("/api/public/v2/metrics", {
          params: {
            query: JSON.stringify({
              view: "observations",
              metrics: [
                { measure: "totalCost", aggregation: "sum" },
                { measure: "totalTokens", aggregation: "sum" },
                { measure: "inputTokens", aggregation: "sum" },
                { measure: "outputTokens", aggregation: "sum" },
                { measure: "count", aggregation: "sum" },
              ],
              dimensions: [],
              filters: [{ type: "string", column: "userId", operator: "=", value: userId }],
              fromTimestamp: fromDate.toISOString(),
              toTimestamp: new Date().toISOString(),
            }),
          },
        });
        const m = metricsResponse?.data?.[0];
        if (m) {
          if (m.sum_totalCost != null) totalCost = Number(m.sum_totalCost);
          if (m.sum_totalTokens != null) totalTokens = Number(m.sum_totalTokens);
          if (m.sum_inputTokens != null) inputTokens = Number(m.sum_inputTokens);
          if (m.sum_outputTokens != null) outputTokens = Number(m.sum_outputTokens);
          if (m.sum_count != null) totalObservations = Number(m.sum_count);
        }
      } catch (e) {
        console.warn("Failed to fetch user metrics", e);
        totalCost = traces.reduce((s: number, t: any) => s + (t.totalCost ?? 0), 0);
        totalTokens = traces.reduce((s: number, t: any) => s + (t.usage?.total ?? 0), 0);
      }

      return {
        userId,
        totalTraces,
        totalObservations,
        totalTokens,
        inputTokens,
        outputTokens,
        totalCost,
        firstTrace: timestamps[0] ?? "",
        lastTrace: timestamps[timestamps.length - 1] ?? "",
      };
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches traces for a specific Langfuse user (API key).
 */
export function useUserTraces(userId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["lf-user-traces", userId, page, limit],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await langfuseClient.get("/api/public/traces", {
        params: { userId, page, limit, orderBy: "timestamp.DESC" },
      });
      return data as {
        data: any[];
        meta: { totalItems: number; totalPages: number; page: number; limit: number };
      };
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches sessions for a specific Langfuse user (API key).
 */
export function useUserSessions(userId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["lf-user-sessions", userId, page, limit],
    enabled: !!userId,
    queryFn: async () => {
      try {
        const { data } = await langfuseClient.get("/api/public/sessions", {
          params: { userId, page, limit },
        });
        return data as {
          data: any[];
          meta: { totalItems: number; totalPages: number; page: number; limit: number };
        };
      } catch {
        return { data: [], meta: { totalItems: 0, totalPages: 0, page: 1, limit } };
      }
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches scores for a specific Langfuse user (API key).
 */
export function useUserScores(userId: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["lf-user-scores", userId, page, limit],
    enabled: !!userId,
    queryFn: async () => {
      try {
        const { data } = await langfuseClient.get("/api/public/scores", {
          params: { userId, page, limit },
        });
        return data as {
          data: any[];
          meta: { totalItems: number; totalPages: number; page: number; limit: number };
        };
      } catch {
        return { data: [], meta: { totalItems: 0, totalPages: 0, page: 1, limit } };
      }
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetches observations for a specific Langfuse user (API key).
 */
export function useUserObservations(userId: string, type?: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["lf-user-observations", userId, type, page, limit],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await langfuseClient.get("/api/public/observations", {
        params: {
          userId,
          ...(type ? { type } : {}),
          page,
          limit,
        },
      });
      return data as {
        data: any[];
        meta: { totalItems: number; totalPages: number; page: number; limit: number };
      };
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

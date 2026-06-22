import { useQuery } from "@tanstack/react-query";
import { langfuseClient } from "@/api/langfuse";

export interface LangfuseUser {
  userId: string;
  totalTraces: number;
  totalObservations: number;
  totalTokens: number;
  totalCost: number;
  firstTrace: string;
  lastTrace: string;
}

export function useLangfuseUsersList(page = 1, limit = 50, searchUserId?: string) {
  return useQuery({
    queryKey: ["lf-users-list", page, limit, searchUserId],
    queryFn: async () => {
      // 1. Fetch recent traces to find active users and their first/last event timestamps.
      const { data: tracesResponse } = await langfuseClient.get("/api/public/traces", {
        params: {
          limit: 100,
          ...(searchUserId ? { userId: searchUserId } : {}),
        },
      });

      const traces: any[] = tracesResponse?.data ?? [];
      const usersMap = new Map<string, LangfuseUser>();

      for (const t of traces) {
        if (!t.userId) continue;

        if (!usersMap.has(t.userId)) {
          usersMap.set(t.userId, {
            userId: t.userId,
            totalTraces: 0,
            totalObservations: 0,
            totalTokens: 0,
            totalCost: 0,
            firstTrace: t.timestamp,
            lastTrace: t.timestamp,
          });
        }

        const u = usersMap.get(t.userId)!;
        u.totalTraces += 1;
        // Basic fallback in case metrics fail
        u.totalCost += (t.totalCost ?? 0);
        u.totalTokens += (t.usage?.total ?? t.usage?.totalTokens ?? 0);

        if (t.timestamp < u.firstTrace) u.firstTrace = t.timestamp;
        if (t.timestamp > u.lastTrace) u.lastTrace = t.timestamp;
      }

      // 2. Fetch /v2/metrics for each discovered user to get accurate totalCost and totalTokens
      try {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 30); // look back 30 days
        const toDate = new Date();
        
        const userIds = Array.from(usersMap.keys());
        
        await Promise.all(userIds.map(async (uid) => {
          try {
            const { data: metricsResponse } = await langfuseClient.get("/api/public/v2/metrics", {
              params: {
                query: JSON.stringify({
                  view: "observations",
                  metrics: [
                    { measure: "totalCost", aggregation: "sum" },
                    { measure: "totalTokens", aggregation: "sum" },
                  ],
                  dimensions: [], // Empty dimensions means no high cardinality guardrails!
                  filters: [{ type: "string", column: "userId", operator: "=", value: uid }],
                  fromTimestamp: fromDate.toISOString(),
                  toTimestamp: toDate.toISOString(),
                }),
              },
            });

            const m = metricsResponse?.data?.[0];
            if (m) {
              const u = usersMap.get(uid)!;
              if (m.sum_totalCost != null) u.totalCost = Number(m.sum_totalCost);
              if (m.sum_totalTokens != null) u.totalTokens = Number(m.sum_totalTokens);
            }
          } catch (err) {
            console.warn(`Failed metrics for user ${uid}`, err);
          }
        }));
      } catch (e) {
        console.warn("Failed to fetch /v2/metrics", e);
      }

      const usersList = Array.from(usersMap.values());
      
      const start = (page - 1) * limit;
      const paginatedData = usersList.slice(start, start + limit);

      return {
        data: paginatedData,
        meta: {
          totalItems: usersList.length,
          totalPages: Math.ceil(usersList.length / limit),
          page,
          limit,
        },
      };
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
}

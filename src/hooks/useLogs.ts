import { useQuery } from "@tanstack/react-query"
import { adminApi, GetLogsParams, LogEntry, PaginatedLogsResponse } from "@/api/admin"

export type { LogEntry, PaginatedLogsResponse }

export function usePaginatedLogs(params: GetLogsParams) {
  return useQuery({
    queryKey: ["logs-paginated", params],
    queryFn: () => adminApi.getLogs(params),
    refetchInterval: () => false
  })
}


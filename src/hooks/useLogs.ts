import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"

export interface LogEntry {
  id: string
  request_id: string
  app_name: string
  level: "info" | "warn" | "error"
  method?: string
  url?: string
  status?: number
  duration?: number
  credits_deducted?: number
  api_key?: string
  user_id?: string
  message: string
  metadata?: any
  response_data?: any
  created_at: string
}

export function useLogs() {
  return useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LogEntry[] }>(`/api/logs/latest?limit=9999999`)
      return res.data.data || []
    },
    refetchInterval: () => {
      // Polling could be enabled here if we implement a "Live" switch
      return false
    }
  })
}

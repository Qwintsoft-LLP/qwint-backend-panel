import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import { adminApi } from "@/api/admin"

export interface UserBalance {
  user_id: string
  name: string
  mobile: string
  balance_credits: number
  is_active: boolean
  created_at: string
}

export interface WalletTransaction {
  id: string
  created_at: string
  type: "CREDIT" | "DEBIT"
  amount: number
  app_name: string
  status: string
  description: string
  reference_id: string
}

export function useWalletBalances() {
  return useQuery({
    queryKey: ["walletBalances"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: UserBalance[] }>("/api/wallet/admin/balances")
      return res.data.data || []
    },
  })
}

export function useTopup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { user_id: string; credits: number; note: string }) => {
      const res = await apiClient.post("/api/wallet/topup", data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["walletBalances"] })
    },
  })
}

export function useUserTransactions(userId: string) {
  return useQuery({
    queryKey: ["walletTransactions", userId],
    queryFn: async () => {
      try {
        // As requested: fall back to the /api/admin/logs endpoint and map "credits deducted" 
        // to display as transactions if the direct transaction API is unavailable.
        // We use "api_key" because the Langfuse userId is recorded as the API key 
        // in the backend logs, and "search" might miss some records.
        const res = await adminApi.getLogs({ api_key: userId, limit: 1000 })
        const logs = res.data || []
        
        const mappedLogs: WalletTransaction[] = logs
          .filter(log => log.credits_deducted != null && log.credits_deducted > 0)
          .map(log => ({
            id: log.id,
            created_at: log.created_at,
            type: "DEBIT",
            amount: log.credits_deducted || 0,
            app_name: log.app_name || "Unknown App",
            status: (log.status && log.status >= 200 && log.status < 300) || log.level === "info" ? "SUCCESS" : "FAILED",
            description: log.message || "API Call Deduction",
            reference_id: log.request_id || log.id
          }))
          
        return mappedLogs
      } catch (err) {
        console.error("Failed to fetch logs for transactions fallback", err)
        return []
      }
    },
    enabled: !!userId,
  })
}

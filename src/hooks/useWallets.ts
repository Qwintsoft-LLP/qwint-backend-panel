import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"

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
      // Pass user_id as query param for admin lookup
      const res = await apiClient.get<{ data: WalletTransaction[] }>(`/api/wallet/transactions`, {
        params: { user_id: userId }
      })
      return res.data.data || []
    },
    enabled: !!userId,
  })
}

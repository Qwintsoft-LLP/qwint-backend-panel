import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/api/client"

export interface ApiKey {
  key: string
  username: string
  budget: number
  remaining_budget: number
  is_active: boolean
  created_at: string
  last_used?: string
  note?: string
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["apiKeys"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ApiKey[] }>("/v1/admin/keys")
      return res.data.data || []
    },
  })
}

export function useGenerateKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { username: string; budget: number; note: string; withZip?: boolean }) => {
      const endpoint = data.withZip ? "/v1/admin/keys/generate-with-zip" : "/v1/admin/keys/generate"
      const res = await apiClient.post(endpoint, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
    },
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { key: string; operation: "credit" | "debit"; amount: number; description: string }) => {
      const payload = {
        key: data.key,
        action: data.operation === "credit" ? "cr" : "dr",
        budget: data.amount,
        description: data.description
      }
      const res = await apiClient.put("/v1/admin/keys/update-budget", payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
    },
  })
}

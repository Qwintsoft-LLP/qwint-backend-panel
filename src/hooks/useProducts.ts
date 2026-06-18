import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"

export interface Product {
  product_id: string
  name: string
  amount: number
  credits: number
  currency: string
}

export interface Order {
  id: string
  customer_name: string
  customer_mobile: string
  customer_email?: string
  customer_state?: string
  product_id: string
  amount: number
  credits: number
  credits_raw?: number
  credits_unit?: string
  razorpay_order_id?: string
  razorpay_payment_id?: string
  status: string
  created_at: string
  updated_at: string
  currency: string
  api_key?: string
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Product[] }>("/api/v1/pricing/plans")
      return res.data.data || []
    },
  })
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Order[] }>("/api/v1/admin/orders")
      return res.data.data || []
    },
  })
}

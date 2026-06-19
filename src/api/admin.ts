import { apiClient } from "./client"

export interface LogEntry {
  id: string
  request_id: string
  app_name: string
  level: "info" | "warn" | "error" | string
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
  response_time_ms?: number
}

export interface PaginatedLogsResponse {
  data: LogEntry[]
  meta: {
    total_items: number
    total_pages: number
    current_page: number
    limit: number
    stats: {
      total_errors: number
      avg_latency_ms: number
      total_credits_deducted: number
      total_tokens: number
      prompt_tokens: number
      thoughts_tokens: number
      candidates_tokens: number
    }
  }
}

export interface KpiMetrics {
  total_revenue: number
  active_users: number
  total_api_calls: number
  error_rate_percentage: number
  total_credits_used: number
}

export interface DailyUsageMetric {
  date: string
  api_calls: number
  credits_used: number
  errors: number
}

export interface TopUserMetric {
  api_key: string
  username: string;
  total_calls: number;
  credits_used: number;
  last_activity?: string;
  total_tokens?: number;
  prompt_tokens?: number;
  candidates_tokens?: number;
}

export interface RouteUsageMetric {
  route: string
  method: string
  call_count: number
  avg_latency_ms: number
}

export interface DashboardStatsResponse {
  kpis: {
    total: number;
    errors: number;
    totalCredits: number;
    avgDuration: number;
    uniqueKeys: number
    totalTokens?: number
    promptTokens?: number
    candidatesTokens?: number
  };
  timeSeries: {
    date: string;
    credits: number;
    success: number;
    error: number;
    warn: number;
    totalTokens?: number;
    promptTokens?: number;
    candidatesTokens?: number;
  }[];
  appSplit: { name: string; value: number }[];
  levelBreakdown: { name: string; value: number }[];
  statusCodeDist: { name: string; value: number }[];
  responseTimeDist: { label: string; count: number }[];
  hourlyHeatmap: { hour: number; count: number; credits: number }[];
}

// ── Parameters Interfaces ──
export interface GetLogsParams {
  page?: number
  limit?: number
  search?: string
  level?: string
  method?: string
  app_name?: string
  api_key?: string
  user_id?: string
  date_from?: string
  date_to?: string
  sort_by?: string
  sort_order?: "asc" | "desc"
}

export interface DateRangeParams {
  date_from?: string
  date_to?: string
}

export interface DashboardStatsParams extends DateRangeParams {
  app_name?: string;
  api_key?: string;
  interval?: 'day' | 'hour';
}

export interface DailyParams extends DateRangeParams {
  days?: number
}

export interface TopUsersParams extends DateRangeParams {
  limit?: number
  sort_by?: "credits" | "calls"
  app_name?: string
  api_key?: string
}

export const adminApi = {
  getLogs: async (params?: GetLogsParams) => {
    const res = await apiClient.get<PaginatedLogsResponse>("/api/admin/logs", { params })
    return res.data
  },

  getKpis: async (params?: DateRangeParams) => {
    const res = await apiClient.get<KpiMetrics>("/api/admin/analytics/kpis", { params })
    return res.data
  },

  getDailyUsage: async (params?: DailyParams) => {
    const res = await apiClient.get<{ data: DailyUsageMetric[] }>("/api/admin/analytics/daily", { params })
    return res.data.data
  },

  getTopUsers: async (params?: TopUsersParams) => {
    const res = await apiClient.get<{ data: TopUserMetric[] }>("/api/admin/analytics/top-users", { params })
    return res.data.data
  },

  getRouteUsage: async (params?: DateRangeParams) => {
    const res = await apiClient.get<{ data: RouteUsageMetric[] }>("/api/admin/analytics/routes", { params })
    return res.data.data
  },

  getDashboardStats: async (params?: DashboardStatsParams) => {
    const res = await apiClient.get<{ data: DashboardStatsResponse }>("/api/admin/analytics/dashboard", { params })
    return res.data.data
  }
}

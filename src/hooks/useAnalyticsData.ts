import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, subHours, parseISO, format } from "date-fns";
import { apiClient } from "@/api/client";
import { type ApiKey } from "@/hooks/useApiKeys";
import { adminApi } from "@/api/admin";

// ── Date range presets ───────────────────────────────────────────────────────
export type RangePreset = "1h" | "6h" | "24h" | "7d" | "30d" | "custom";

export interface DateRange {
  from: Date;
  to:   Date;
}

export const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "1h",  label: "Last 1h"  },
  { key: "6h",  label: "Last 6h"  },
  { key: "24h", label: "Last 24h" },
  { key: "7d",  label: "Last 7d"  },
  { key: "30d", label: "Last 30d" },
  { key: "custom", label: "Custom" },
];

const presetToRange = (preset: RangePreset): DateRange => {
  const now = new Date();
  switch (preset) {
    case "1h":  return { from: subHours(now, 1),   to: now };
    case "6h":  return { from: subHours(now, 6),   to: now };
    case "24h": return { from: subHours(now, 24),  to: now };
    case "7d":  return { from: subDays(now, 7),    to: now };
    case "30d": return { from: subDays(now, 30),   to: now };
    default:    return { from: subDays(now, 7),    to: now };
  }
};

// ── Main hook ────────────────────────────────────────────────────────────────
export const useAnalyticsData = () => {
  const [preset, setPreset]         = useState<RangePreset>("24h");
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [appFilter, setAppFilter]   = useState<string>("all");

  const range: DateRange = useMemo(() => {
    return preset === "custom" && customRange
      ? customRange
      : presetToRange(preset);
  }, [preset, customRange]);

  const diffDays = (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24);
  const interval = diffDays > 3 ? 'day' : 'hour';

  // Fetch Dashboard Stats
  const {
    data:      dashboardStats,
    isLoading: logsLoading,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey:        ["analytics-dashboard", range, appFilter, interval],
    queryFn: async () => {
      return adminApi.getDashboardStats({
        date_from: range.from.toISOString(),
        date_to: range.to.toISOString(),
        app_name: appFilter === 'all' ? undefined : appFilter,
        interval
      });
    },
    staleTime:       60_000,
    refetchInterval: 120_000,   // Auto-refresh every 2 minutes
  });

  const {
    data:      keys = [],
    isLoading: keysLoading,
  } = useQuery<ApiKey[]>({
    queryKey: ["admin-keys"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: ApiKey[] }>("/v1/admin/keys")
      return res.data.data || []
    },
    staleTime: 5 * 60_000,
  });

  const {
    data: topUsers = [],
    isLoading: topUsersLoading
  } = useQuery({
    queryKey: ["analytics-top-users", range],
    queryFn: async () => {
      return adminApi.getTopUsers({
        date_from: range.from.toISOString(),
        date_to: range.to.toISOString(),
        limit: 10,
        sort_by: 'credits'
      });
    },
    staleTime: 60_000,
  });

  const availableApps: string[] = ["qwint_talk", "qwint_caption"];

  const kpis = useMemo(() => {
    if (!dashboardStats?.kpis) return { total: 0, errors: 0, successRate: "—", totalCredits: 0, avgDuration: 0, p95Duration: 0, uniqueKeys: 0 };
    const { total, errors, totalCredits, avgDuration, uniqueKeys } = dashboardStats.kpis;
    const successRate = total > 0 ? (((total - errors) / total) * 100).toFixed(1) : "—";
    return { total, errors, successRate, totalCredits, avgDuration: Math.round(avgDuration), p95Duration: Math.round(avgDuration), uniqueKeys };
  }, [dashboardStats]);

  const creditBurnSeries = useMemo(() => {
    if (!dashboardStats?.timeSeries) return [];
    return dashboardStats.timeSeries.map((d: any) => {
      const date = parseISO(d.date);
      const label = interval === 'day' ? format(date, "MMM dd") : format(date, "MMM dd HH:00");
      return { label, credits: d.credits };
    });
  }, [dashboardStats, interval]);

  const requestVolumeSeries = useMemo(() => {
    if (!dashboardStats?.timeSeries) return [];
    return dashboardStats.timeSeries.map((d: any) => {
      const date = parseISO(d.date);
      const label = interval === 'day' ? format(date, "MMM dd") : format(date, "HH:00");
      return { label, success: d.success, error: d.error, warn: d.warn };
    });
  }, [dashboardStats, interval]);

  const successFailSplit = useMemo(() => {
    if (!dashboardStats?.kpis) return [];
    const { total, errors } = dashboardStats.kpis;
    const success = total - errors;
    return [
      { name: "Success", value: success, color: "#22C55E" },
      { name: "Error",   value: errors,  color: "#EF4444" },
    ].filter(d => d.value > 0);
  }, [dashboardStats]);

  const appSplit = useMemo(() => {
    if (!dashboardStats?.appSplit) return [];
    const APP_COLORS = ["#7C3AED", "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#EC4899", "#14B8A6", "#F97316"];
    return dashboardStats.appSplit
      .sort((a: any, b: any) => b.value - a.value)
      .map((d: any, i: number) => ({ ...d, color: APP_COLORS[i % APP_COLORS.length] }));
  }, [dashboardStats]);

  const levelBreakdown = useMemo(() => {
    if (!dashboardStats?.levelBreakdown) return [];
    return dashboardStats.levelBreakdown.map((d: any) => {
      const color = d.name === "INFO" ? "#3B82F6" : d.name === "WARN" ? "#F59E0B" : "#EF4444";
      return { ...d, color };
    }).filter((d: any) => d.value > 0);
  }, [dashboardStats]);

  const responseTimeDist = dashboardStats?.responseTimeDist || [];
  const statusCodeDist = dashboardStats?.statusCodeDist || [];

  const hourlyHeatmap = useMemo(() => {
    if (!dashboardStats?.hourlyHeatmap) return [];
    const maxCount = Math.max(...dashboardStats.hourlyHeatmap.map((h: any) => h.count), 0);
    return dashboardStats.hourlyHeatmap.map((h: any) => ({ ...h, intensity: maxCount > 0 ? h.count / maxCount : 0 }));
  }, [dashboardStats]);

  const budgetHealth = useMemo(() => {
    return [...keys]
      .filter(k => k.is_active)
      .sort((a, b) => Number(b.budget) - Number(a.budget))
      .map(k => {
        const budget = Number(k.budget);
        const remaining = Number(k.remaining_budget);
        return {
          username:   k.username,
          budget:     budget,
          remaining:  remaining,
          used:       budget - remaining,
          pct:        budget > 0 ? (remaining / budget) * 100 : 0,
        };
      });
  }, [keys]);

  const topKeysByCredits = useMemo(() => {
    return topUsers.map((u: any) => ({
      key: u.api_key,
      fullKey: u.api_key,
      credits: u.credits_used,
      requests: u.total_calls
    }));
  }, [topUsers]);

  return {
    preset, setPreset,
    customRange, setCustomRange,
    appFilter, setAppFilter,
    range, availableApps,
    loading: logsLoading || keysLoading || topUsersLoading,
    dataUpdatedAt,
    refetch,
    kpis,
    creditBurnSeries,
    requestVolumeSeries,
    levelBreakdown,
    successFailSplit,
    appSplit,
    topKeysByCredits,
    responseTimeDist,
    budgetHealth,
    hourlyHeatmap,
    statusCodeDist,
    logs: [], // No longer available
    keys,
  };
};

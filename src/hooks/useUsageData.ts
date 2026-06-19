import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subHours, subDays, format, parseISO, startOfHour, startOfDay, eachHourOfInterval, eachDayOfInterval, isSameHour, isSameDay } from "date-fns";
import { apiClient } from "@/api/client";
import { adminApi } from "@/api/admin";
import type { ApiKey } from "@/hooks/useApiKeys";

export type UsagePreset = "1h" | "6h" | "24h" | "7d" | "30d" | "custom";

export interface UsageDateRange { from: Date; to: Date }

const PRESET_LABELS: Record<UsagePreset, string> = {
  "1h": "Last 1 hour", "6h": "Last 6 hours", "24h": "Last 24 hours",
  "7d": "Last 7 days", "30d": "Last 30 days", "custom": "Custom range",
};

const presetToRange = (p: UsagePreset): UsageDateRange => {
  const now = new Date();
  const map: Record<UsagePreset, UsageDateRange> = {
    "1h":  { from: subHours(now, 1),  to: now },
    "6h":  { from: subHours(now, 6),  to: now },
    "24h": { from: subHours(now, 24), to: now },     // ← DEFAULT
    "7d":  { from: subDays(now, 7),   to: now },
    "30d": { from: subDays(now, 30),  to: now },
    "custom": { from: subHours(now, 24), to: now },
  };
  return map[p];
};

export const useUsageData = () => {
  // ── Default state: 24h, no filters — page is useful with ZERO interaction ──
  const [preset, setPreset]           = useState<UsagePreset>("24h");
  const [customRange, setCustomRange] = useState<UsageDateRange | null>(null);
  const [appFilter, setAppFilter]     = useState<string>("all");
  const [keyFilter, setKeyFilter]     = useState<string>("all");

  const range = useMemo(() => {
    return preset === "custom" && customRange ? customRange : presetToRange(preset);
  }, [preset, customRange]);

  // ── Base queries — same pattern as Dashboard/Analytics, proven safe ──────
  const diffDays = (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24);
  const interval = diffDays > 3 ? 'day' : 'hour';

  const { data: dashboardStats, isLoading: statsLoading, dataUpdatedAt, refetch: refetchStats } = useQuery({
    queryKey: ["usage-dashboard", range, appFilter, keyFilter, interval],
    queryFn: async () => {
      return adminApi.getDashboardStats({
        date_from: range.from.toISOString(),
        date_to: range.to.toISOString(),
        app_name: appFilter === 'all' ? undefined : appFilter,
        api_key: keyFilter === 'all' ? undefined : keyFilter,
        interval
      });
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: topUsers = [], isLoading: topUsersLoading } = useQuery({
    queryKey: ["usage-top-users", range, appFilter, keyFilter],
    queryFn: async () => {
      return adminApi.getTopUsers({
        date_from: range.from.toISOString(),
        date_to: range.to.toISOString(),
        app_name: appFilter === 'all' ? undefined : appFilter,
        api_key: keyFilter === 'all' ? undefined : keyFilter,
        limit: 100, // fetch up to 100 keys for usage table
        sort_by: 'credits'
      });
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: keys = [], isLoading: keysLoading } = useQuery({
    queryKey: ["admin-keys"],
    queryFn:  async () => {
      const res = await apiClient.get<{ data: ApiKey[] }>("/v1/admin/keys");
      return res.data.data || [];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const availableApps = ["qwint_talk", "qwint_caption"];

  // ── KPI: Total credits ────────────────────────────────────────────────
  const totalCredits = dashboardStats?.kpis?.totalCredits || 0;

  // ── KPI: Total requests ───────────────────────────────────────────────
  const totalRequests = dashboardStats?.kpis?.total || 0;

  // ── KPI: Tokens (from Backend DB) ─────────────────────────────────────
  const tokenStats = useMemo(() => {
    if (dashboardStats?.kpis && (dashboardStats.kpis.totalTokens || dashboardStats.kpis.promptTokens)) {
      const input = dashboardStats.kpis.promptTokens || 0;
      const output = dashboardStats.kpis.candidatesTokens || 0;
      const total = dashboardStats.kpis.totalTokens || (input + output);
      return { input, output, total, cost: 0 };
    }
    return { input: 0, output: 0, total: 0, cost: 0 };
  }, [dashboardStats]);

  // ── Credit usage over time (area chart) ──────────────────────────────
  const creditTimeSeries = useMemo(() => {
    const intervals = interval === 'day' 
      ? eachDayOfInterval({ start: startOfDay(range.from), end: startOfDay(range.to) })
      : eachHourOfInterval({ start: startOfHour(range.from), end: startOfHour(range.to) });

    const series = dashboardStats?.timeSeries || [];

    return intervals.map(date => {
      const label = interval === 'day' ? format(date, "MMM dd") : format(date, "MMM dd HH:00");
      const match = series.find((d: any) => {
        const dDate = parseISO(d.date);
        return interval === 'day' ? isSameDay(dDate, date) : isSameHour(dDate, date);
      });
      return { label, credits: match ? match.credits : 0 };
    });
  }, [dashboardStats, interval, range]);

  // ── Credits by app (donut) ────────────────────────────────────────────
  const creditsByApp = useMemo(() => {
    if (!dashboardStats?.appSplit) return [];
    const COLORS = ["#7C3AED", "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#EC4899"];
    return dashboardStats.appSplit
      .sort((a: any, b: any) => b.credits - a.credits)
      .map((d: any, i: number) => ({ name: d.name, value: +Number(d.credits || 0).toFixed(2), color: COLORS[i % COLORS.length] }));
  }, [dashboardStats]);

  // ── Per-key usage table ───────────────────────────────────────────────
  const perKeyUsage = useMemo(() => {
    const keyMap = new Map(keys.map((k: ApiKey) => [k.key, k]));
    return topUsers.map((u: any) => ({
      apiKey: u.api_key,
      username: u.username || "(unknown key)",
      requests: u.total_calls,
      credits: +Number(u.credits_used).toFixed(2),
      lastUsed: u.last_activity || null,
      totalTokens: u.total_tokens || 0,
      remaining: keyMap.get(u.api_key)?.remaining_budget ?? null,
    }));
  }, [topUsers, keys]);

  // ── Token usage over time — input vs output stacked ────────
  const tokenTimeSeries = useMemo(() => {
    const intervals = interval === 'day' 
      ? eachDayOfInterval({ start: startOfDay(range.from), end: startOfDay(range.to) })
      : eachHourOfInterval({ start: startOfHour(range.from), end: startOfHour(range.to) });

    const series = dashboardStats?.timeSeries || [];

    return intervals.map(date => {
      const label = interval === 'day' ? format(date, "MMM dd") : format(date, "MMM dd HH:00");
      const match = series.find((d: any) => {
        const dDate = parseISO(d.date);
        return interval === 'day' ? isSameDay(dDate, date) : isSameHour(dDate, date);
      });
      return { 
        label, 
        input: match ? (match.promptTokens || 0) : 0, 
        output: match ? (match.candidatesTokens || 0) : 0 
      };
    });
  }, [dashboardStats, interval, range]);

  // ── Model cost breakdown ────────────────────────────────────
  const modelCosts = useMemo(() => {
    return [];
  }, [range]);

  // ── Hourly burn (heatmap) ─────────────────────────────────────────────
  const hourlyBurn = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({ hour: i, credits: 0, requests: 0, intensity: 0 }));
    const series = dashboardStats?.timeSeries || [];
    
    let maxCredits = 0;
    series.forEach((d: any) => {
      const hr = parseISO(d.date).getHours();
      h[hr].credits += d.credits || 0;
      h[hr].requests += d.total_calls || d.api_calls || d.requests || 1; 
      if (h[hr].credits > maxCredits) maxCredits = h[hr].credits;
    });

    h.forEach(slot => {
      slot.intensity = maxCredits > 0 ? slot.credits / maxCredits : 0;
    });

    return h;
  }, [dashboardStats]);

  return {
    // Controls
    preset, setPreset, customRange, setCustomRange, range,
    appFilter, setAppFilter, keyFilter, setKeyFilter,
    availableApps, keys,
    presetLabel: PRESET_LABELS[preset],

    // Loading
    loading:      statsLoading || keysLoading || topUsersLoading,
    dataUpdatedAt,
    refetch: refetchStats,

    // KPIs
    totalCredits, totalRequests, tokenStats,

    // Charts
    creditTimeSeries, creditsByApp, perKeyUsage,
    tokenTimeSeries, modelCosts, hourlyBurn,
  };
};

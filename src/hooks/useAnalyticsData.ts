import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, subHours, isWithinInterval, parseISO, startOfHour, format, eachDayOfInterval, eachHourOfInterval } from "date-fns";
import { apiClient } from "@/api/client";
import { type LogEntry } from "@/hooks/useLogs";
import { type ApiKey } from "@/hooks/useApiKeys";

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

  const range: DateRange = preset === "custom" && customRange
    ? customRange
    : presetToRange(preset);

  // Fetch
  const {
    data:      rawLogs = [],
    isLoading: logsLoading,
    dataUpdatedAt,
    refetch,
  } = useQuery<LogEntry[]>({
    queryKey:        ["analytics-logs"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LogEntry[] }>("/api/logs/latest?limit=9999999")
      return res.data.data || []
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

  // ── Filter pipeline ─────────────────────────────────────────────────────
  const logs: LogEntry[] = useMemo(() => {
    return rawLogs.filter(l => {
      const date = parseISO(l.created_at);
      const inRange = isWithinInterval(date, { start: range.from, end: range.to });
      const inApp   = appFilter === "all" || l.app_name === appFilter;
      return inRange && inApp;
    });
  }, [rawLogs, range, appFilter]);

  // ── Available apps (for filter dropdown) ────────────────────────────────
  const availableApps: string[] = useMemo(() => {
    const apps = new Set(rawLogs.map(l => l.app_name));
    return Array.from(apps);
  }, [rawLogs]);

  // ── KPI computations ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total          = logs.length;
    const errors         = logs.filter(l => l.level === "error").length;
    const successRate    = total > 0 ? ((total - errors) / total * 100).toFixed(1) : "—";
    const totalCredits   = logs.reduce((s, l) => s + Number(l.credits_deducted ?? 0), 0);
    const avgDuration    = (() => {
      const timed = logs.filter(l => l.duration != null);
      if (!timed.length) return 0;
      return Math.round(timed.reduce((s, l) => s + Number(l.duration ?? 0), 0) / timed.length);
    })();
    const p95Duration    = (() => {
      const durations = logs
        .filter(l => l.duration != null)
        .map(l => Number(l.duration))
        .sort((a, b) => a - b);
      if (!durations.length) return 0;
      const idx = Math.floor(durations.length * 0.95);
      return durations[idx];
    })();
    const uniqueKeys     = new Set(logs.filter(l => l.api_key).map(l => l.api_key)).size;

    return { total, errors, successRate, totalCredits, avgDuration, p95Duration, uniqueKeys };
  }, [logs]);

  // ── Credit burn over time ────────────────────────────────────────────────
  // Bucket by hour for <= 7d, by day for > 7d
  const creditBurnSeries = useMemo(() => {
    const diffDays = (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24);
    const useDays  = diffDays > 3;

    const buckets: Record<string, number> = {};
    if (useDays) {
      eachDayOfInterval({ start: range.from, end: range.to }).forEach(d => {
        buckets[format(d, "yyyy-MM-dd")] = 0;
      });
    } else {
      eachHourOfInterval({ start: range.from, end: range.to }).forEach(d => {
        buckets[format(d, "yyyy-MM-dd HH:00")] = 0;
      });
    }
    logs.forEach(l => {
      if (!l.credits_deducted) return;
      const date = parseISO(l.created_at);
      const key  = useDays
        ? format(date, "yyyy-MM-dd")
        : format(startOfHour(date), "yyyy-MM-dd HH:00");
      buckets[key] = (buckets[key] ?? 0) + Number(l.credits_deducted);
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, credits]) => {
        const label = useDays ? format(parseISO(key), "MMM dd") : format(parseISO(key.replace(" ", "T")), "MMM dd HH:00");
        return { label, credits: +credits.toFixed(2) };
      });
  }, [logs, range]);

  // ── Request volume over time ─────────────────────────────────────────────
  const requestVolumeSeries = useMemo(() => {
    const diffDays = (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24);
    const useDays  = diffDays > 3;

    const buckets: Record<string, { success: number; error: number; warn: number }> = {};
    if (useDays) {
      eachDayOfInterval({ start: range.from, end: range.to }).forEach(d => {
        buckets[format(d, "yyyy-MM-dd")] = { success: 0, error: 0, warn: 0 };
      });
    } else {
      eachHourOfInterval({ start: range.from, end: range.to }).forEach(d => {
        buckets[format(d, "yyyy-MM-dd HH:00")] = { success: 0, error: 0, warn: 0 };
      });
    }
    logs.forEach(l => {
      const date = parseISO(l.created_at);
      const key  = useDays
        ? format(date, "yyyy-MM-dd")
        : format(startOfHour(date), "yyyy-MM-dd HH:00");
      if (!buckets[key]) buckets[key] = { success: 0, error: 0, warn: 0 };
      if      (l.level === "error") buckets[key].error++;
      else if (l.level === "warn")  buckets[key].warn++;
      else                          buckets[key].success++;
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, counts]) => {
        const label = useDays ? format(parseISO(key), "MMM dd") : format(parseISO(key.replace(" ", "T")), "HH:00");
        return { label, ...counts };
      });
  }, [logs, range]);

  // ── Log level breakdown ──────────────────────────────────────────────────
  const levelBreakdown = useMemo(() => {
    const counts: Record<string, number> = { info: 0, warn: 0, error: 0 };
    logs.forEach(l => { counts[l.level] = (counts[l.level] ?? 0) + 1; });
    return [
      { name: "INFO",  value: counts.info,  color: "#3B82F6" },
      { name: "WARN",  value: counts.warn,  color: "#F59E0B" },
      { name: "ERROR", value: counts.error, color: "#EF4444" },
    ].filter(d => d.value > 0);
  }, [logs]);

  // ── Success vs Error (pie) ───────────────────────────────────────────────
  const successFailSplit = useMemo(() => {
    const errors   = logs.filter(l => l.level === "error").length;
    const success  = logs.length - errors;
    return [
      { name: "Success", value: success, color: "#22C55E" },
      { name: "Error",   value: errors,  color: "#EF4444" },
    ].filter(d => d.value > 0);
  }, [logs]);

  // ── App split (pie) ──────────────────────────────────────────────────────
  const appSplit = useMemo(() => {
    const APP_COLORS = [
      "#7C3AED", "#3B82F6", "#22C55E", "#F59E0B",
      "#EF4444", "#EC4899", "#14B8A6", "#F97316",
    ];
    const counts: Record<string, number> = {};
    logs.forEach(l => { counts[l.app_name] = (counts[l.app_name] ?? 0) + 1; });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({ name, value, color: APP_COLORS[i % APP_COLORS.length] }));
  }, [logs]);

  // ── Top API keys by credits used ─────────────────────────────────────────
  const topKeysByCredits = useMemo(() => {
    const totals: Record<string, { credits: number; requests: number }> = {};
    logs.forEach(l => {
      if (!l.api_key) return;
      if (!totals[l.api_key]) totals[l.api_key] = { credits: 0, requests: 0 };
      totals[l.api_key].credits  += Number(l.credits_deducted ?? 0);
      totals[l.api_key].requests += 1;
    });
    return Object.entries(totals)
      .sort(([, a], [, b]) => b.credits - a.credits)
      .slice(0, 10)
      .map(([key, data]) => ({
        key:      key,
        fullKey:  key,
        credits:  +data.credits.toFixed(2),
        requests: data.requests,
      }));
  }, [logs]);

  // ── Response time distribution (bucketed) ────────────────────────────────
  // Buckets: <100ms | 100-300 | 300-500 | 500-1000 | 1000-3000 | >3000
  const responseTimeDist = useMemo(() => {
    const buckets = [
      { label: "<100ms",    min: 0,    max: 100,   count: 0 },
      { label: "100-300ms", min: 100,  max: 300,   count: 0 },
      { label: "300-500ms", min: 300,  max: 500,   count: 0 },
      { label: "500ms-1s",  min: 500,  max: 1000,  count: 0 },
      { label: "1-3s",      min: 1000, max: 3000,  count: 0 },
      { label: ">3s",       min: 3000, max: Infinity, count: 0 },
    ];
    logs.forEach(l => {
      if (l.duration == null) return;
      const bucket = buckets.find(b => l.duration! >= b.min && l.duration! < b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [logs]);

  // ── Budget health (from keys) ─────────────────────────────────────────────
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

  // ── Hourly heatmap (hour of day × count) ─────────────────────────────────
  const hourlyHeatmap = useMemo(() => {
    // 24 slots: 0..23
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, credits: 0 }));
    logs.forEach(l => {
      const h = parseISO(l.created_at).getHours();
      hours[h].count++;
      hours[h].credits += Number(l.credits_deducted ?? 0);
    });
    const maxCount = Math.max(...hours.map(h => h.count));
    return hours.map(h => ({ ...h, intensity: maxCount > 0 ? h.count / maxCount : 0 }));
  }, [logs]);

  // ── HTTP Status code breakdown ────────────────────────────────────────────
  const statusCodeDist = useMemo(() => {
    const groups: Record<string, number> = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, "—": 0 };
    logs.forEach(l => {
      const s = l.status;
      if      (!s)         groups["—"]++;
      else if (s < 300)    groups["2xx"]++;
      else if (s < 400)    groups["3xx"]++;
      else if (s < 500)    groups["4xx"]++;
      else                 groups["5xx"]++;
    });
    return Object.entries(groups)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [logs]);

  return {
    // Filter state
    preset, setPreset,
    customRange, setCustomRange,
    appFilter, setAppFilter,
    range, availableApps,
    // Loading
    loading: logsLoading || keysLoading,
    dataUpdatedAt,
    refetch,
    // KPIs
    kpis,
    // Chart data
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
    // Raw
    logs, keys,
  };
};

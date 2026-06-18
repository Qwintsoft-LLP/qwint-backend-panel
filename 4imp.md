# Qwint Talk Admin Panel — Analytics Page Implementation
**Version:** 1.0.0 | **Page Route:** `/analytics` | **Audience:** Frontend Engineer

---

## 0. What This Page Is

A dedicated full-screen analytics dashboard. Not a widget on the existing dashboard — a separate page with its own route, its own data pipeline, its own chart layout, and its own filter system.

The admin opens this page to answer questions like:
- "Which API key is burning the most budget?"
- "What time of day do we get the most errors?"
- "How has credit usage trended over the last 7 days?"
- "Which app (qwint_talk vs qwint_caption) drives more load?"
- "How many requests succeeded vs failed this week?"

Everything on this page is computed from two endpoints:
- `GET /logs/latest` — primary data source (usage, errors, timing, credit burn)
- `GET /admin/keys` — secondary (budget utilization, key health)

All charts update when the date range or filter changes. No new backend endpoints needed.

---

## 1. Add to Sidebar Navigation

```tsx
// In src/components/layout/Sidebar.tsx
// Add under OVERVIEW group, after Dashboard:

{ to: "/analytics", label: "Analytics", icon: BarChart2 }
```

Add route in `src/main.tsx`:
```tsx
<Route path="analytics" element={<Analytics />} />
```

---

## 2. Page Layout — Full Specification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Analytics                         [Date Range Picker]  [App ▾]  [Refresh] │  ← Page header (48px)
├─────────────────────────────────────────────────────────────────────────────┤
│  [KPI Strip — 6 inline stats]                                               │  ← 40px
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Credit Burn Over Time — Line/Area — 60%] [Request Volume — Bar — 40%]   │  ← Row 1 (280px)
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Log Level Distribution — Bar] [Success vs Error — Pie] [App Split — Pie]│  ← Row 2 (240px)
│           34%                           33%                    33%          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Top API Keys by Credits Used — Horizontal Bar — 50%]                     │
│  [Response Time Distribution — Bar — 50%]                                  │  ← Row 3 (240px)
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Budget Health by Key — Full Width Horizontal Bars]                       │  ← Row 4 (auto)
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Hourly Heatmap — Requests by Hour of Day — Full Width]                   │  ← Row 5 (160px)
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Raw Events Table — filterable, sortable, paginated — Full Width]         │  ← Row 6 (auto)
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Pipeline & State

### 3.1 — All state lives in one hook

**`src/hooks/useAnalyticsData.ts`**

```ts
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, subHours, isWithinInterval, parseISO, startOfHour, format } from "date-fns";
import { logsApi, type LogEntry } from "@/api/logs";
import { adminApi, type ApiKey } from "@/api/admin";

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
  } = useQuery({
    queryKey:        ["analytics-logs"],
    queryFn:         logsApi.latest,
    staleTime:       60_000,
    refetchInterval: 120_000,   // Auto-refresh every 2 minutes
  });

  const {
    data:      keys = [],
    isLoading: keysLoading,
  } = useQuery({
    queryKey: ["admin-keys"],
    queryFn:  adminApi.listKeys,
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
    const totalCredits   = logs.reduce((s, l) => s + (l.credits_deducted ?? 0), 0);
    const avgDuration    = (() => {
      const timed = logs.filter(l => l.duration_ms != null);
      if (!timed.length) return 0;
      return Math.round(timed.reduce((s, l) => s + (l.duration_ms ?? 0), 0) / timed.length);
    })();
    const p95Duration    = (() => {
      const durations = logs
        .filter(l => l.duration_ms != null)
        .map(l => l.duration_ms as number)
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
    logs.forEach(l => {
      if (!l.credits_deducted) return;
      const date = parseISO(l.created_at);
      const key  = useDays
        ? format(date, "MMM dd")
        : format(startOfHour(date), "MMM dd HH:00");
      buckets[key] = (buckets[key] ?? 0) + l.credits_deducted;
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, credits]) => ({ label, credits: +credits.toFixed(2) }));
  }, [logs, range]);

  // ── Request volume over time ─────────────────────────────────────────────
  const requestVolumeSeries = useMemo(() => {
    const diffDays = (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24);
    const useDays  = diffDays > 3;

    const buckets: Record<string, { success: number; error: number; warn: number }> = {};
    logs.forEach(l => {
      const date = parseISO(l.created_at);
      const key  = useDays
        ? format(date, "MMM dd")
        : format(startOfHour(date), "HH:00");
      if (!buckets[key]) buckets[key] = { success: 0, error: 0, warn: 0 };
      if      (l.level === "error") buckets[key].error++;
      else if (l.level === "warn")  buckets[key].warn++;
      else                          buckets[key].success++;
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, counts]) => ({ label, ...counts }));
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
      totals[l.api_key].credits  += l.credits_deducted ?? 0;
      totals[l.api_key].requests += 1;
    });
    return Object.entries(totals)
      .sort(([, a], [, b]) => b.credits - a.credits)
      .slice(0, 10)
      .map(([key, data]) => ({
        key:      key.slice(-8),   // Show last 8 chars only
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
      if (l.duration_ms == null) return;
      const bucket = buckets.find(b => l.duration_ms! >= b.min && l.duration_ms! < b.max);
      if (bucket) bucket.count++;
    });
    return buckets;
  }, [logs]);

  // ── Budget health (from keys) ─────────────────────────────────────────────
  const budgetHealth = useMemo(() => {
    return [...keys]
      .filter(k => k.is_active)
      .sort((a, b) => b.budget - a.budget)
      .map(k => ({
        username:   k.username,
        budget:     k.budget,
        remaining:  k.remaining_budget,
        used:       k.budget - k.remaining_budget,
        pct:        k.budget > 0 ? (k.remaining_budget / k.budget) * 100 : 0,
      }));
  }, [keys]);

  // ── Hourly heatmap (hour of day × count) ─────────────────────────────────
  const hourlyHeatmap = useMemo(() => {
    // 24 slots: 0..23
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0, credits: 0 }));
    logs.forEach(l => {
      const h = parseISO(l.created_at).getHours();
      hours[h].count++;
      hours[h].credits += l.credits_deducted ?? 0;
    });
    const maxCount = Math.max(...hours.map(h => h.count));
    return hours.map(h => ({ ...h, intensity: maxCount > 0 ? h.count / maxCount : 0 }));
  }, [logs]);

  // ── HTTP Status code breakdown ────────────────────────────────────────────
  const statusCodeDist = useMemo(() => {
    const groups: Record<string, number> = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, "—": 0 };
    logs.forEach(l => {
      const s = l.status_code;
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
```

---

## 4. Filter Bar Component

**`src/pages/analytics/AnalyticsFilters.tsx`**

```tsx
import { useState } from "react";
import { Calendar, RefreshCw, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PRESETS, type RangePreset, type DateRange } from "@/hooks/useAnalyticsData";

interface Props {
  preset:         RangePreset;
  setPreset:      (p: RangePreset) => void;
  customRange:    DateRange | null;
  setCustomRange: (r: DateRange) => void;
  appFilter:      string;
  setAppFilter:   (a: string) => void;
  availableApps:  string[];
  dataUpdatedAt:  number;
  refetch:        () => void;
  loading:        boolean;
}

export const AnalyticsFilters = ({
  preset, setPreset, customRange, setCustomRange,
  appFilter, setAppFilter, availableApps,
  dataUpdatedAt, refetch, loading,
}: Props) => {
  const [customOpen, setCustomOpen] = useState(false);
  const [fromStr, setFromStr]       = useState("");
  const [toStr, setToStr]           = useState("");

  const applyCustom = () => {
    const from = new Date(fromStr);
    const to   = new Date(toStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) return;
    setCustomRange({ from, to });
    setPreset("custom");
    setCustomOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* Date range preset pills */}
      <div className="flex items-center gap-1 p-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]">
        {PRESETS.filter(p => p.key !== "custom").map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              preset === p.key
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            )}
          >
            {p.label}
          </button>
        ))}

        {/* Custom range picker */}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors",
                preset === "custom"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
              )}
            >
              <Calendar size={11} />
              {preset === "custom" && customRange
                ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d")}`
                : "Custom"
              }
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64 p-3 bg-[var(--bg-elevated)] border-[var(--border)] space-y-3"
          >
            <p className="text-xs font-semibold text-[var(--text-primary)]">Custom Date Range</p>
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">From</label>
                <Input
                  type="datetime-local"
                  value={fromStr}
                  onChange={e => setFromStr(e.target.value)}
                  className="h-8 text-xs mt-1 bg-[var(--bg-surface)]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">To</label>
                <Input
                  type="datetime-local"
                  value={toStr}
                  onChange={e => setToStr(e.target.value)}
                  className="h-8 text-xs mt-1 bg-[var(--bg-surface)]"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={applyCustom}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 h-7 text-xs"
                onClick={() => setCustomOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* App filter */}
      <Select value={appFilter} onValueChange={setAppFilter}>
        <SelectTrigger className="h-8 w-40 text-xs bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectValue placeholder="All Apps" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectItem value="all" className="text-xs">All Apps</SelectItem>
          {availableApps.map(app => (
            <SelectItem key={app} value={app} className="text-xs">{app}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Last updated + refresh */}
      <div className="flex items-center gap-2 ml-auto">
        {dataUpdatedAt > 0 && (
          <span className="text-[10px] text-[var(--text-muted)]">
            Updated {format(dataUpdatedAt, "HH:mm:ss")}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => refetch()}
          disabled={loading}
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>
    </div>
  );
};
```

---

## 5. KPI Strip

**`src/pages/analytics/KpiStrip.tsx`**

```tsx
import { TrendingUp, AlertTriangle, Clock, Zap, Key, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPI {
  label:     string;
  value:     string | number;
  sub?:      string;
  icon:      React.ReactNode;
  tone?:     "normal" | "good" | "bad" | "warn";
}

const TONE_COLORS: Record<string, string> = {
  normal: "text-[var(--text-primary)]",
  good:   "text-[var(--success)]",
  bad:    "text-[var(--error)]",
  warn:   "text-[var(--warning)]",
};

export const KpiStrip = ({ kpis: data }: {
  kpis: {
    total: number;
    errors: number;
    successRate: string;
    totalCredits: number;
    avgDuration: number;
    p95Duration: number;
    uniqueKeys: number;
  }
}) => {
  const items: KPI[] = [
    {
      label: "Total Requests",
      value: data.total.toLocaleString(),
      icon:  <TrendingUp size={13} />,
      tone:  "normal",
    },
    {
      label: "Errors",
      value: data.errors.toLocaleString(),
      sub:   `of ${data.total} requests`,
      icon:  <AlertTriangle size={13} />,
      tone:  data.errors === 0 ? "good" : data.errors > data.total * 0.1 ? "bad" : "warn",
    },
    {
      label: "Success Rate",
      value: `${data.successRate}%`,
      icon:  <CheckCircle2 size={13} />,
      tone:  +data.successRate >= 99 ? "good" : +data.successRate >= 95 ? "warn" : "bad",
    },
    {
      label: "Credits Used",
      value: data.totalCredits.toFixed(1),
      sub:   "in selected range",
      icon:  <Zap size={13} />,
      tone:  "normal",
    },
    {
      label: "Avg Response",
      value: `${data.avgDuration}ms`,
      sub:   `p95: ${data.p95Duration}ms`,
      icon:  <Clock size={13} />,
      tone:  data.avgDuration < 300 ? "good" : data.avgDuration < 1000 ? "warn" : "bad",
    },
    {
      label: "Active Keys",
      value: data.uniqueKeys,
      sub:   "in selected range",
      icon:  <Key size={13} />,
      tone:  "normal",
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-0 border border-[var(--border)] rounded-md overflow-hidden bg-[var(--bg-surface)]">
      {items.map((kpi, i) => (
        <div
          key={kpi.label}
          className={cn(
            "flex items-start gap-2.5 px-3 py-2.5",
            i < items.length - 1 && "border-r border-[var(--border)]",
            i >= 3 && "border-t md:border-t-0 border-[var(--border)]"
          )}
        >
          <div className={cn("mt-0.5 opacity-60", TONE_COLORS[kpi.tone ?? "normal"])}>
            {kpi.icon}
          </div>
          <div className="min-w-0">
            <p className={cn("text-base font-semibold font-mono leading-tight", TONE_COLORS[kpi.tone ?? "normal"])}>
              {kpi.value}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{kpi.label}</p>
            {kpi.sub && (
              <p className="text-[10px] text-[var(--text-muted)] truncate">{kpi.sub}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 6. Chart Card Wrapper

Every chart sits in this wrapper — consistent header, loading state, empty state.

**`src/pages/analytics/ChartCard.tsx`**

```tsx
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title:       string;
  subtitle?:   string;
  children:    React.ReactNode;
  className?:  string;
  height?:     number;    // chart height in px (not card height)
  loading?:    boolean;
  empty?:      boolean;
  emptyMsg?:   string;
  action?:     React.ReactNode;
}

export const ChartCard = ({
  title, subtitle, children, className,
  height = 220, loading, empty, emptyMsg, action,
}: ChartCardProps) => (
  <div className={cn(
    "border border-[var(--border)] rounded-md bg-[var(--bg-surface)] p-3 admin-card",
    className
  )}>
    {/* Header */}
    <div className="flex items-start justify-between mb-3">
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)]">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>

    {/* Body */}
    <div style={{ height }}>
      {loading ? (
        <div className="w-full h-full bg-[var(--bg-elevated)] rounded animate-pulse" />
      ) : empty ? (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-xs text-[var(--text-muted)]">{emptyMsg ?? "No data in this range"}</p>
        </div>
      ) : (
        children
      )}
    </div>
  </div>
);
```

---

## 7. All Chart Components

### 7.1 — Credit Burn Area Chart

**`src/pages/analytics/charts/CreditBurnChart.tsx`**

```tsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-2.5 py-2 rounded border border-[var(--border)] bg-[var(--bg-elevated)] text-xs">
      <p className="text-[var(--text-muted)] mb-1">{label}</p>
      <p className="font-mono font-semibold text-[var(--accent)]">
        {payload[0].value.toFixed(2)} credits
      </p>
    </div>
  );
};

export const CreditBurnChart = ({ data }: { data: { label: string; credits: number }[] }) => {
  const avg = data.length
    ? data.reduce((s, d) => s + d.credits, 0) / data.length
    : 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <defs>
          <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        {avg > 0 && (
          <ReferenceLine
            y={avg}
            stroke="var(--warning)"
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{ value: "avg", position: "right", fontSize: 9, fill: "var(--warning)" }}
          />
        )}
        <Area
          type="monotone"
          dataKey="credits"
          stroke="#7C3AED"
          strokeWidth={1.5}
          fill="url(#creditGrad)"
          dot={false}
          activeDot={{ r: 3, fill: "#7C3AED", stroke: "var(--bg-surface)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
```

### 7.2 — Request Volume Stacked Bar Chart

**`src/pages/analytics/charts/RequestVolumeChart.tsx`**

```tsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export const RequestVolumeChart = ({
  data,
}: {
  data: { label: string; success: number; warn: number; error: number }[];
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barCategoryGap="30%">
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 10, fill: "var(--text-muted)" }}
        axisLine={false}
        tickLine={false}
        interval="preserveStartEnd"
      />
      <YAxis
        tick={{ fontSize: 10, fill: "var(--text-muted)" }}
        axisLine={false}
        tickLine={false}
      />
      <Tooltip
        contentStyle={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          fontSize: 11,
          color: "var(--text-primary)",
        }}
      />
      <Legend
        wrapperStyle={{ fontSize: 10, color: "var(--text-muted)", paddingTop: 8 }}
        iconSize={8}
        iconType="circle"
      />
      <Bar dataKey="success" stackId="a" fill="#22C55E" fillOpacity={0.85} name="Success" radius={[0,0,0,0]} />
      <Bar dataKey="warn"    stackId="a" fill="#F59E0B" fillOpacity={0.85} name="Warn" />
      <Bar dataKey="error"   stackId="a" fill="#EF4444" fillOpacity={0.85} name="Error" radius={[3,3,0,0]} />
    </BarChart>
  </ResponsiveContainer>
);
```

### 7.3 — Pie Charts (shared component, different data)

**`src/pages/analytics/charts/PieBreakdown.tsx`**

```tsx
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface Slice { name: string; value: number; color: string }

const RADIAN = Math.PI / 180;
const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;   // Don't label tiny slices
  const r   = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x   = cx + r * Math.cos(-midAngle * RADIAN);
  const y   = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

export const PieBreakdown = ({
  data,
  donut = false,
}: {
  data:   Slice[];
  donut?: boolean;
}) => {
  const innerRadius = donut ? "55%" : "0%";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={innerRadius}
          outerRadius="70%"
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
          label={CustomLabel}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} fillOpacity={0.9} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 11,
            color: "var(--text-primary)",
          }}
          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }}
          iconSize={8}
          iconType="circle"
          layout="horizontal"
          verticalAlign="bottom"
        />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

### 7.4 — Top Keys Horizontal Bar

**`src/pages/analytics/charts/TopKeysChart.tsx`**

```tsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export const TopKeysChart = ({
  data,
}: {
  data: { key: string; credits: number; requests: number }[];
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      data={data}
      layout="vertical"
      margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
    >
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
      <XAxis
        type="number"
        tick={{ fontSize: 10, fill: "var(--text-muted)" }}
        axisLine={false}
        tickLine={false}
      />
      <YAxis
        type="category"
        dataKey="key"
        tick={{ fontSize: 10, fill: "var(--text-secondary)", fontFamily: "monospace" }}
        axisLine={false}
        tickLine={false}
        width={72}
      />
      <Tooltip
        contentStyle={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          fontSize: 11,
          color: "var(--text-primary)",
        }}
        formatter={(v: number, name: string) =>
          [name === "credits" ? `${v.toFixed(2)} cr` : v.toLocaleString(), name === "credits" ? "Credits" : "Requests"]
        }
      />
      <Bar dataKey="credits" radius={[0, 3, 3, 0]} maxBarSize={18}>
        {data.map((_, i) => (
          <Cell
            key={i}
            fill="#7C3AED"
            fillOpacity={1 - i * 0.07}   // Fade from top to bottom for rank effect
          />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);
```

### 7.5 — Response Time Distribution

**`src/pages/analytics/charts/ResponseTimeChart.tsx`**

```tsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export const ResponseTimeChart = ({
  data,
}: {
  data: { label: string; count: number }[];
}) => {
  const max = Math.max(...data.map(d => d.count));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 11,
          }}
          formatter={(v: number) => [v.toLocaleString(), "Requests"]}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={36}>
          {data.map((entry, i) => {
            // Color: green for fast, yellow for medium, red for slow
            const color =
              i === 0 ? "#22C55E" :
              i === 1 ? "#86EFAC" :
              i === 2 ? "#F59E0B" :
              i === 3 ? "#FB923C" :
                        "#EF4444";
            return (
              <Cell
                key={i}
                fill={color}
                fillOpacity={entry.count === max ? 1 : 0.7}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
```

### 7.6 — Budget Health (full-width horizontal bars, not recharts — pure CSS)

**`src/pages/analytics/charts/BudgetHealthBars.tsx`**

```tsx
import { cn } from "@/lib/utils";

interface BudgetRow {
  username:  string;
  budget:    number;
  remaining: number;
  used:      number;
  pct:       number;
}

export const BudgetHealthBars = ({ data }: { data: BudgetRow[] }) => (
  <div className="space-y-2">
    {data.length === 0 && (
      <p className="text-xs text-[var(--text-muted)] text-center py-4">No active keys</p>
    )}
    {data.map(row => {
      const color =
        row.pct >= 70 ? "bg-[var(--success)]" :
        row.pct >= 30 ? "bg-[var(--warning)]" :
                        "bg-[var(--error)]";
      const textColor =
        row.pct >= 70 ? "text-[var(--success)]" :
        row.pct >= 30 ? "text-[var(--warning)]" :
                        "text-[var(--error)]";

      return (
        <div key={row.username}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs text-[var(--text-secondary)] font-medium truncate max-w-[180px]">
              {row.username}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] text-[var(--text-muted)]">
                ${row.used.toFixed(0)} used
              </span>
              <span className={cn("text-[10px] font-semibold font-mono w-10 text-right", textColor)}>
                {row.pct.toFixed(0)}%
              </span>
              <span className="text-[10px] text-[var(--text-muted)] w-20 text-right">
                ${row.remaining.toFixed(2)} left
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", color)}
              style={{ width: `${Math.max(row.pct, 0.5)}%` }}
            />
          </div>
        </div>
      );
    })}
  </div>
);
```

### 7.7 — Hourly Heatmap

A 24-cell heatmap showing which hours of the day have the most traffic.

**`src/pages/analytics/charts/HourlyHeatmap.tsx`**

```tsx
import { cn } from "@/lib/utils";

interface HourSlot {
  hour:      number;
  count:     number;
  credits:   number;
  intensity: number;   // 0..1
}

export const HourlyHeatmap = ({ data }: { data: HourSlot[] }) => (
  <div>
    <div className="flex gap-1">
      {data.map(slot => {
        const alpha = 0.1 + slot.intensity * 0.9;
        return (
          <div
            key={slot.hour}
            className="flex-1 min-w-0 group relative"
            title={`${String(slot.hour).padStart(2, "0")}:00 — ${slot.count} requests, ${slot.credits.toFixed(1)} cr`}
          >
            <div
              className="h-10 rounded-sm transition-all duration-300 cursor-default"
              style={{ backgroundColor: `rgba(124, 58, 237, ${alpha})` }}
            />
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] text-[var(--text-primary)] whitespace-nowrap shadow-md">
                <p className="font-semibold">{String(slot.hour).padStart(2, "0")}:00</p>
                <p>{slot.count} req</p>
                <p>{slot.credits.toFixed(1)} cr</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
    {/* Hour labels */}
    <div className="flex gap-1 mt-1">
      {data.map(slot => (
        <div key={slot.hour} className="flex-1 text-center text-[9px] text-[var(--text-muted)]">
          {slot.hour % 6 === 0 ? `${String(slot.hour).padStart(2,"0")}h` : ""}
        </div>
      ))}
    </div>
    {/* Legend */}
    <div className="flex items-center gap-2 mt-2 justify-end">
      <span className="text-[10px] text-[var(--text-muted)]">Less</span>
      {[0.1, 0.3, 0.5, 0.7, 0.9].map(a => (
        <div
          key={a}
          className="w-4 h-3 rounded-sm"
          style={{ backgroundColor: `rgba(124, 58, 237, ${a})` }}
        />
      ))}
      <span className="text-[10px] text-[var(--text-muted)]">More</span>
    </div>
  </div>
);
```

---

## 8. Raw Events Table (bottom of page)

A filterable, sortable, paginated table of the raw log entries in the selected range.

**`src/pages/analytics/RawEventsTable.tsx`**

```tsx
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminTable } from "@/components/shared/AdminTable";
import { StatusBadge, levelBadge } from "@/components/shared/StatusBadge";
import { CopyField } from "@/components/shared/CopyField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { shortTime, statusColor, cn } from "@/lib/utils";
import type { LogEntry } from "@/api/logs";

const PAGE_SIZES = [25, 50, 100];

export const RawEventsTable = ({ logs }: { logs: LogEntry[] }) => {
  const [search,   setSearch]   = useState("");
  const [level,    setLevel]    = useState("all");
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => logs.filter(l => {
    const matchLevel  = level === "all" || l.level === level;
    const matchSearch = !search
      || l.url.includes(search)
      || l.message.toLowerCase().includes(search.toLowerCase())
      || (l.api_key ?? "").includes(search);
    return matchLevel && matchSearch;
  }), [logs, search, level]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns = [
    {
      key: "time", header: "Time", width: "90px",
      cell: (r: LogEntry) => (
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          {shortTime(r.created_at)}
        </span>
      ),
    },
    {
      key: "level", header: "Level", width: "56px",
      cell: (r: LogEntry) => levelBadge(r.level),
    },
    {
      key: "method", header: "Method", width: "56px",
      cell: (r: LogEntry) => r.method
        ? <StatusBadge variant="ghost">{r.method}</StatusBadge>
        : <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: "url", header: "URL",
      cell: (r: LogEntry) => (
        <span className="text-xs font-mono text-[var(--text-secondary)] truncate block max-w-[260px]"
          title={r.url}>
          {r.url}
        </span>
      ),
    },
    {
      key: "status", header: "Status", width: "64px",
      cell: (r: LogEntry) => r.status_code
        ? <span className={cn("text-xs font-mono font-semibold", statusColor(r.status_code))}>
            {r.status_code}
          </span>
        : <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: "duration", header: "Duration", width: "80px", align: "right" as const,
      cell: (r: LogEntry) => r.duration_ms != null
        ? <span className="text-xs font-mono text-[var(--text-secondary)]">{r.duration_ms}ms</span>
        : <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: "credits", header: "Credits", width: "72px", align: "right" as const,
      cell: (r: LogEntry) => r.credits_deducted != null
        ? <span className="text-xs font-mono text-[var(--text-secondary)]">−{r.credits_deducted.toFixed(2)}</span>
        : <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: "key", header: "API Key", width: "120px",
      cell: (r: LogEntry) => r.api_key
        ? <CopyField value={r.api_key} showLast={8} />
        : <span className="text-[var(--text-muted)]">—</span>,
    },
  ];

  return (
    <div className="border border-[var(--border)] rounded-md bg-[var(--bg-surface)] admin-card overflow-hidden">
      {/* Table header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
        <span className="text-xs font-semibold text-[var(--text-primary)]">Raw Events</span>
        <span className="text-[11px] text-[var(--text-muted)]">({filtered.length})</span>
        <div className="flex-1" />
        <Input
          placeholder="Search URL, message, key..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="h-7 text-xs w-48 bg-[var(--bg-surface)]"
        />
        <Select value={level} onValueChange={v => { setLevel(v); setPage(1); }}>
          <SelectTrigger className="h-7 w-24 text-xs bg-[var(--bg-surface)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)]">
            <SelectItem value="all"   className="text-xs">All</SelectItem>
            <SelectItem value="info"  className="text-xs">Info</SelectItem>
            <SelectItem value="warn"  className="text-xs">Warn</SelectItem>
            <SelectItem value="error" className="text-xs">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table body */}
      <AdminTable
        columns={columns}
        data={paginated}
        rowKey={r => r.id}
        loading={false}
        emptyMessage={search || level !== "all" ? "No matching events" : "No events in this range"}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-muted)]">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={v => { setPageSize(+v); setPage(1); }}
          >
            <SelectTrigger className="h-7 w-16 text-xs bg-[var(--bg-surface)]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)]">
              {PAGE_SIZES.map(s => (
                <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--text-muted)]">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={13} />
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight size={13} />
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## 9. Full Page Assembly

**`src/pages/Analytics.tsx`**

```tsx
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { PageHeader }        from "@/components/shared/PageHeader";
import { AnalyticsFilters }  from "./analytics/AnalyticsFilters";
import { KpiStrip }          from "./analytics/KpiStrip";
import { ChartCard }         from "./analytics/ChartCard";
import { CreditBurnChart }   from "./analytics/charts/CreditBurnChart";
import { RequestVolumeChart }from "./analytics/charts/RequestVolumeChart";
import { PieBreakdown }      from "./analytics/charts/PieBreakdown";
import { TopKeysChart }      from "./analytics/charts/TopKeysChart";
import { ResponseTimeChart } from "./analytics/charts/ResponseTimeChart";
import { BudgetHealthBars }  from "./analytics/charts/BudgetHealthBars";
import { HourlyHeatmap }     from "./analytics/charts/HourlyHeatmap";
import { RawEventsTable }    from "./analytics/RawEventsTable";

export default function Analytics() {
  const d = useAnalyticsData();

  return (
    <div className="space-y-3">

      {/* Header */}
      <PageHeader
        title="Analytics"
        subtitle={`${d.logs.length.toLocaleString()} events in selected range`}
        actions={
          <AnalyticsFilters
            preset={d.preset}          setPreset={d.setPreset}
            customRange={d.customRange} setCustomRange={d.setCustomRange}
            appFilter={d.appFilter}    setAppFilter={d.setAppFilter}
            availableApps={d.availableApps}
            dataUpdatedAt={d.dataUpdatedAt}
            refetch={d.refetch}
            loading={d.loading}
          />
        }
      />

      {/* KPI strip */}
      <KpiStrip kpis={d.kpis} />

      {/* Row 1 — Credit burn + Request volume */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <ChartCard
          title="Credit Burn Over Time"
          subtitle="Credits deducted per time bucket"
          className="lg:col-span-3"
          height={220}
          loading={d.loading}
          empty={d.creditBurnSeries.length < 2}
          emptyMsg="Not enough data points — try a wider range"
        >
          <CreditBurnChart data={d.creditBurnSeries} />
        </ChartCard>

        <ChartCard
          title="Request Volume"
          subtitle="Success / warn / error by time bucket"
          className="lg:col-span-2"
          height={220}
          loading={d.loading}
          empty={d.requestVolumeSeries.length === 0}
        >
          <RequestVolumeChart data={d.requestVolumeSeries} />
        </ChartCard>
      </div>

      {/* Row 2 — Three pies */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChartCard
          title="Log Level Distribution"
          subtitle="INFO / WARN / ERROR breakdown"
          height={200}
          loading={d.loading}
          empty={d.levelBreakdown.length === 0}
        >
          <PieBreakdown data={d.levelBreakdown} donut />
        </ChartCard>

        <ChartCard
          title="Success vs Error"
          subtitle="Overall request outcome"
          height={200}
          loading={d.loading}
          empty={d.successFailSplit.length === 0}
        >
          <PieBreakdown data={d.successFailSplit} donut />
        </ChartCard>

        <ChartCard
          title="Traffic by App"
          subtitle="Request share per application"
          height={200}
          loading={d.loading}
          empty={d.appSplit.length === 0}
        >
          <PieBreakdown data={d.appSplit} />
        </ChartCard>
      </div>

      {/* Row 3 — Top keys + Response time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ChartCard
          title="Top API Keys by Credits Used"
          subtitle="Last 8 chars of key shown"
          height={220}
          loading={d.loading}
          empty={d.topKeysByCredits.length === 0}
          emptyMsg="No credit usage in this range"
        >
          <TopKeysChart data={d.topKeysByCredits} />
        </ChartCard>

        <ChartCard
          title="Response Time Distribution"
          subtitle="Number of requests per latency bucket"
          height={220}
          loading={d.loading}
          empty={d.responseTimeDist.every(b => b.count === 0)}
          emptyMsg="No timed requests in this range"
        >
          <ResponseTimeChart data={d.responseTimeDist} />
        </ChartCard>
      </div>

      {/* Row 4 — Budget health */}
      <ChartCard
        title="Budget Health by Key"
        subtitle="Remaining budget % for all active keys"
        height="auto" as any
        loading={d.loading}
        empty={d.budgetHealth.length === 0}
        emptyMsg="No active API keys"
      >
        <BudgetHealthBars data={d.budgetHealth} />
      </ChartCard>

      {/* Row 5 — Hourly heatmap */}
      <ChartCard
        title="Traffic Heatmap"
        subtitle="Request density by hour of day (all days in range combined)"
        height={80}
        loading={d.loading}
        empty={d.hourlyHeatmap.every(h => h.count === 0)}
        emptyMsg="No traffic data in this range"
      >
        <HourlyHeatmap data={d.hourlyHeatmap} />
      </ChartCard>

      {/* Row 6 — Raw events */}
      <RawEventsTable logs={d.logs} />

    </div>
  );
}
```

---

## 10. File Delivery Order

```
1.  src/hooks/useAnalyticsData.ts
2.  src/pages/analytics/ChartCard.tsx
3.  src/pages/analytics/KpiStrip.tsx
4.  src/pages/analytics/AnalyticsFilters.tsx
5.  src/pages/analytics/charts/CreditBurnChart.tsx
6.  src/pages/analytics/charts/RequestVolumeChart.tsx
7.  src/pages/analytics/charts/PieBreakdown.tsx
8.  src/pages/analytics/charts/TopKeysChart.tsx
9.  src/pages/analytics/charts/ResponseTimeChart.tsx
10. src/pages/analytics/charts/BudgetHealthBars.tsx
11. src/pages/analytics/charts/HourlyHeatmap.tsx
12. src/pages/analytics/RawEventsTable.tsx
13. src/pages/Analytics.tsx
14. Add route + sidebar entry
```

---

## 11. Acceptance Checklist

**Filters**
- [ ] All 5 preset buttons (1h/6h/24h/7d/30d) update every chart instantly
- [ ] Custom range: from/to datetime inputs apply correctly
- [ ] App filter: selecting `qwint_caption` shows only that app's data across all charts
- [ ] Clearing app filter back to "All" restores full data
- [ ] Refresh button reloads raw data and re-applies current filters

**KPI Strip**
- [ ] All 6 KPIs compute correctly against filtered log set
- [ ] Success rate turns green (≥99%), amber (95–99%), red (<95%)
- [ ] Avg response turns green (<300ms), amber (<1000ms), red (≥1000ms)
- [ ] Errors value color matches severity

**Charts**
- [ ] Credit Burn shows area chart with gradient fill and average reference line
- [ ] Hourly bucket used when range ≤ 3d; daily bucket for > 3d
- [ ] Request Volume shows stacked bar with green/amber/red layers
- [ ] All three pie charts render with percentage labels on slices > 5%
- [ ] Top Keys chart shows last 8 chars of key; bars fade in rank order
- [ ] Response time chart colors: green → yellow → red left to right
- [ ] Budget health bars: green ≥70%, amber 30–70%, red <30%
- [ ] Heatmap cells darken with intensity; tooltip shows hour/count/credits on hover
- [ ] All charts show "No data in this range" empty state correctly
- [ ] All charts show shimmer skeleton while loading

**Raw Events Table**
- [ ] Shows only events in the currently selected range
- [ ] Search filters by URL, message, and API key simultaneously
- [ ] Level filter (All/Info/Warn/Error) works correctly
- [ ] Pagination: page size 25/50/100, correct count display
- [ ] Status codes color-coded: 2xx green, 4xx amber, 5xx red
- [ ] API key column shows last 8 chars with copy button

**Tooltips**
- [ ] All recharts tooltips use CSS var colors (visible in both dark and light mode)
- [ ] Heatmap custom tooltips appear on hover and are positioned correctly

---

*End of Analytics Page Implementation Plan*  
*Qwint Talk Admin Panel*
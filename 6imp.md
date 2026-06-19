# Qwint Admin — Usage Overview Page
## Implementation Plan v1.0.0
**Route:** `/usage` | **Default range:** Last 24 hours, zero clicks required
**Audience:** Frontend Engineer
**Purpose:** The single page that answers "what did we use today" with nothing to set up

---

## 0. The Problem This Page Solves

Right now, answering "how many credits did we burn today" requires: open Logs → click date filter → set range to today → scroll through raw rows → mentally sum the `credits_deducted` column. That's five steps for a question the admin will ask multiple times a day.

This page answers it in **zero steps**. It opens already showing the last 24 hours — total credits, total tokens (input/output split), per-key breakdown, per-model cost — fully rendered before the admin touches anything. Filters exist for going deeper, but nothing is required to get the headline numbers.

### What makes this different from `/analytics` and `/langfuse`

| Page | Purpose | Default state |
|---|---|---|
| `/analytics` | Operational health — errors, latency, request volume, traffic patterns | Last 24h, broad operational lens |
| `/langfuse` | LLM observability — traces, generations, latency percentiles | Requires picking a key or browsing |
| `/langfuse/users` | Per-key Langfuse aggregates — events, tokens, cost per userId | Sortable list, exploratory |
| **`/usage`** (this page) | **Billing-lens — credits, tokens, cost, broken down by key/model/app** | **Always opens pre-loaded, last 24h, the answer is already on screen** |

This page is the finance/ops answer. The others are debugging/observability tools. Someone asking "are we burning too many credits" should never have to think about logs, traces, or filters — they open `/usage` and the number is right there.

---

## 1. Data Sources

Two backend sources, zero new endpoints:

```
GET /logs/latest          → credits_deducted, app_name, api_key, user_id, created_at
GET /admin/keys           → username, budget, remaining_budget (for per-key labels + budget context)
```

If Langfuse is configured (`getLangfuseSettings().publicKey` present), one additional source is layered in for token-level detail that the backend logs don't carry:

```
GET /api/public/metrics/daily   → input/output token split, per-model cost (USD)
```

This third source is **optional and additive** — the page works fully without Langfuse configured, just without the token input/output split and model cost table. Everything credit-related comes from your own backend, which is always available.

---

## 2. Page Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Usage Overview                    [24h ▾] [App: All ▾] [Key: All ▾] [⟳]   │  ← Header
├──────────────────────────────────────────────────────────────────────────────┤
│  [Total Credits]  [Total Tokens]  [Input/Output Split]  [Total Cost]  [Reqs]│  ← KPI strip (5 cards)
├──────────────────────────────────────────────────────────────────────────────┤
│  [Credit Usage Over Time — Area chart — 65%]   [Credits by App — Donut 35%]│  ← Row 1
├──────────────────────────────────────────────────────────────────────────────┤
│  [Per-Key Usage Table — sortable, full width]                               │  ← Row 2
│   Key | Requests | Credits | Tokens In | Tokens Out | Est. Cost | Last Used │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Token Usage Over Time — Stacked Area: input vs output — 65%] [Model ─ 35%]│  ← Row 3 (Langfuse-dependent)
├──────────────────────────────────────────────────────────────────────────────┤
│  [Hourly Burn Heatmap — full width]                                         │  ← Row 4
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Hook — Single Source of Truth

**`src/hooks/useUsageData.ts`**

```ts
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subHours, subDays, format, parseISO, startOfHour, startOfDay } from "date-fns";
import { logsApi, type LogEntry } from "@/api/logs";
import { adminApi, type ApiKey } from "@/api/admin";
import { lfApi } from "@/api/langfuse";
import { getLangfuseSettings } from "@/lib/storage";

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

  const range = preset === "custom" && customRange ? customRange : presetToRange(preset);
  const langfuseConfigured = !!getLangfuseSettings().publicKey;

  // ── Base queries — same pattern as Dashboard/Analytics, proven safe ──────
  const { data: rawLogs = [], isLoading: logsLoading, dataUpdatedAt, refetch: refetchLogs } = useQuery({
    queryKey:        ["usage-logs"],
    queryFn:         logsApi.latest,
    staleTime:       30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: keys = [], isLoading: keysLoading } = useQuery({
    queryKey: ["admin-keys"],
    queryFn:  adminApi.listKeys,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Optional Langfuse layer — only fires if configured, routes through the
  // existing rate-limit gate (langfuseGate), so this never adds risk
  const { data: lfDaily, isLoading: lfLoading } = useQuery({
    queryKey: ["lf", "daily", "usage-page"],
    queryFn:  () => lfApi.daily(undefined, 30),
    enabled:  langfuseConfigured,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // ── Filter pipeline ───────────────────────────────────────────────────
  const filteredLogs: LogEntry[] = useMemo(() => {
    return rawLogs.filter(l => {
      const d = parseISO(l.created_at);
      const inRange = d >= range.from && d <= range.to;
      const inApp   = appFilter === "all" || l.app_name === appFilter;
      const inKey   = keyFilter === "all" || l.api_key === keyFilter;
      return inRange && inApp && inKey;
    });
  }, [rawLogs, range, appFilter, keyFilter]);

  const availableApps = useMemo(() =>
    Array.from(new Set(rawLogs.map(l => l.app_name))), [rawLogs]);

  // ── KPI: Total credits ────────────────────────────────────────────────
  const totalCredits = useMemo(() =>
    filteredLogs.reduce((s, l) => s + (l.credits_deducted ?? 0), 0), [filteredLogs]);

  // ── KPI: Total requests ───────────────────────────────────────────────
  const totalRequests = filteredLogs.length;

  // ── KPI: Tokens (from Langfuse daily, filtered to range by date overlap) ─
  const tokenStats = useMemo(() => {
    if (!lfDaily?.data) return { input: 0, output: 0, total: 0, cost: 0 };
    const inRangeDays = lfDaily.data.filter(d => {
      const day = parseISO(d.date);
      return day >= startOfDay(range.from) && day <= range.to;
    });
    let input = 0, output = 0, cost = 0;
    inRangeDays.forEach(day => {
      day.usage.forEach(u => {
        input  += u.inputUsage;
        output += u.outputUsage;
        cost   += u.totalCost;
      });
    });
    return { input, output, total: input + output, cost };
  }, [lfDaily, range]);

  // ── Credit usage over time (area chart) ──────────────────────────────
  const creditTimeSeries = useMemo(() => {
    const diffHrs = (range.to.getTime() - range.from.getTime()) / 36e5;
    const useHour = diffHrs <= 72;
    const buckets: Record<string, number> = {};
    filteredLogs.forEach(l => {
      if (!l.credits_deducted) return;
      const d   = parseISO(l.created_at);
      const key = useHour ? format(startOfHour(d), "MMM d, HH:00") : format(d, "MMM d");
      buckets[key] = (buckets[key] ?? 0) + l.credits_deducted;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([label, credits]) => ({ label, credits: +credits.toFixed(2) }));
  }, [filteredLogs, range]);

  // ── Credits by app (donut) ────────────────────────────────────────────
  const creditsByApp = useMemo(() => {
    const COLORS = ["#7C3AED", "#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#EC4899"];
    const totals: Record<string, number> = {};
    filteredLogs.forEach(l => {
      totals[l.app_name] = (totals[l.app_name] ?? 0) + (l.credits_deducted ?? 0);
    });
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({ name, value: +value.toFixed(2), color: COLORS[i % COLORS.length] }));
  }, [filteredLogs]);

  // ── Per-key usage table ───────────────────────────────────────────────
  const perKeyUsage = useMemo(() => {
    const keyMap = new Map(keys.map(k => [k.key, k]));
    const totals: Record<string, {
      requests: number; credits: number; lastUsed: string | null;
    }> = {};
    filteredLogs.forEach(l => {
      if (!l.api_key) return;
      if (!totals[l.api_key]) totals[l.api_key] = { requests: 0, credits: 0, lastUsed: null };
      totals[l.api_key].requests++;
      totals[l.api_key].credits += l.credits_deducted ?? 0;
      if (!totals[l.api_key].lastUsed || l.created_at > totals[l.api_key].lastUsed!) {
        totals[l.api_key].lastUsed = l.created_at;
      }
    });
    return Object.entries(totals)
      .map(([apiKey, data]) => ({
        apiKey,
        username:  keyMap.get(apiKey)?.username ?? "(unknown key)",
        requests:  data.requests,
        credits:   +data.credits.toFixed(2),
        lastUsed:  data.lastUsed,
        remaining: keyMap.get(apiKey)?.remaining_budget ?? null,
      }))
      .sort((a, b) => b.credits - a.credits);
  }, [filteredLogs, keys]);

  // ── Token usage over time — input vs output stacked (Langfuse) ────────
  const tokenTimeSeries = useMemo(() => {
    if (!lfDaily?.data) return [];
    return lfDaily.data
      .filter(d => {
        const day = parseISO(d.date);
        return day >= startOfDay(range.from) && day <= range.to;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => {
        const input  = d.usage.reduce((s, u) => s + u.inputUsage, 0);
        const output = d.usage.reduce((s, u) => s + u.outputUsage, 0);
        return { label: format(parseISO(d.date), "MMM d"), input, output };
      });
  }, [lfDaily, range]);

  // ── Model cost breakdown (Langfuse) ────────────────────────────────────
  const modelCosts = useMemo(() => {
    if (!lfDaily?.data) return [];
    const inRangeDays = lfDaily.data.filter(d => {
      const day = parseISO(d.date);
      return day >= startOfDay(range.from) && day <= range.to;
    });
    const models: Record<string, { tokens: number; cost: number }> = {};
    inRangeDays.forEach(day => day.usage.forEach(u => {
      if (!models[u.model]) models[u.model] = { tokens: 0, cost: 0 };
      models[u.model].tokens += u.totalUsage;
      models[u.model].cost   += u.totalCost;
    }));
    return Object.entries(models)
      .sort(([, a], [, b]) => b.cost - a.cost)
      .map(([model, data]) => ({ model, ...data }));
  }, [lfDaily, range]);

  // ── Hourly burn heatmap ─────────────────────────────────────────────
  const hourlyBurn = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, credits: 0, requests: 0 }));
    filteredLogs.forEach(l => {
      const h = parseISO(l.created_at).getHours();
      hours[h].credits  += l.credits_deducted ?? 0;
      hours[h].requests += 1;
    });
    const max = Math.max(...hours.map(h => h.credits));
    return hours.map(h => ({ ...h, intensity: max > 0 ? h.credits / max : 0 }));
  }, [filteredLogs]);

  return {
    // Controls
    preset, setPreset, customRange, setCustomRange, range,
    appFilter, setAppFilter, keyFilter, setKeyFilter,
    availableApps, keys,
    presetLabel: PRESET_LABELS[preset],

    // Loading
    loading:      logsLoading || keysLoading,
    langfuseLoading: lfLoading,
    langfuseConfigured,
    dataUpdatedAt,
    refetch: refetchLogs,

    // KPIs
    totalCredits, totalRequests, tokenStats,

    // Charts
    creditTimeSeries, creditsByApp, perKeyUsage,
    tokenTimeSeries, modelCosts, hourlyBurn,
  };
};
```

---

## 4. KPI Strip — 5 Cards, the Headline Numbers

**`src/pages/usage/UsageKpis.tsx`**

```tsx
import { Zap, Hash, ArrowLeftRight, DollarSign, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  totalCredits:  number;
  totalRequests: number;
  tokenStats:    { input: number; output: number; total: number; cost: number };
  langfuseConfigured: boolean;
  loading: boolean;
}

const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(2)}K`
  : n.toLocaleString();

export const UsageKpis = ({ totalCredits, totalRequests, tokenStats, langfuseConfigured, loading }: Props) => {
  const items = [
    {
      icon: <Zap size={14} />,
      label: "Total Credits Used",
      value: totalCredits.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      sub:   `across ${totalRequests.toLocaleString()} requests`,
    },
    {
      icon: <Hash size={14} />,
      label: "Total Tokens",
      value: langfuseConfigured ? fmtNum(tokenStats.total) : "—",
      sub:   langfuseConfigured ? "input + output" : "Langfuse not configured",
    },
    {
      icon: <ArrowLeftRight size={14} />,
      label: "Input / Output Split",
      value: langfuseConfigured
        ? `${fmtNum(tokenStats.input)} / ${fmtNum(tokenStats.output)}`
        : "—",
      sub:   langfuseConfigured
        ? `${((tokenStats.input / (tokenStats.total || 1)) * 100).toFixed(0)}% input`
        : "Connect Langfuse for token detail",
    },
    {
      icon: <DollarSign size={14} />,
      label: "Est. LLM Cost",
      value: langfuseConfigured ? `$${tokenStats.cost.toFixed(4)}` : "—",
      sub:   "USD, model provider cost",
    },
    {
      icon: <Activity size={14} />,
      label: "Avg Credits / Request",
      value: totalRequests > 0 ? (totalCredits / totalRequests).toFixed(2) : "0",
      sub:   "efficiency indicator",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border border-[var(--card-border)] rounded-md overflow-hidden bg-[var(--card-bg)] admin-card">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex items-start gap-2.5 px-3 py-3",
            i < items.length - 1 && "border-r border-[var(--border)]",
            i >= 2 && "border-t md:border-t-0 border-[var(--border)]"
          )}
        >
          <div className="mt-0.5 text-[var(--accent)] opacity-70 shrink-0">{item.icon}</div>
          {loading
            ? <div className="space-y-1.5 w-full">
                <div className="h-5 w-16 bg-[var(--bg-elevated)] rounded animate-pulse" />
                <div className="h-3 w-20 bg-[var(--bg-elevated)] rounded animate-pulse" />
              </div>
            : <div className="min-w-0">
                <p className="text-lg font-bold font-mono text-[var(--text-primary)] leading-tight truncate">
                  {item.value}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{item.sub}</p>
              </div>
          }
        </div>
      ))}
    </div>
  );
};
```

---

## 5. Filter Bar — Time Preset + App + Key

**`src/pages/usage/UsageFilterBar.tsx`**

```tsx
import { useState } from "react";
import { Calendar, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, maskString } from "@/lib/utils";
import type { UsagePreset, UsageDateRange } from "@/hooks/useUsageData";
import type { ApiKey } from "@/api/admin";

const PRESETS: { key: UsagePreset; label: string }[] = [
  { key: "1h",  label: "1h"  },
  { key: "6h",  label: "6h"  },
  { key: "24h", label: "24h" },   // ← default, visually first
  { key: "7d",  label: "7d"  },
  { key: "30d", label: "30d" },
];

interface Props {
  preset:         UsagePreset;
  setPreset:      (p: UsagePreset) => void;
  customRange:    UsageDateRange | null;
  setCustomRange: (r: UsageDateRange) => void;
  appFilter:      string;
  setAppFilter:   (a: string) => void;
  keyFilter:      string;
  setKeyFilter:   (k: string) => void;
  availableApps:  string[];
  keys:           ApiKey[];
  loading:        boolean;
  onRefresh:      () => void;
  dataUpdatedAt:  number;
}

export const UsageFilterBar = ({
  preset, setPreset, customRange, setCustomRange,
  appFilter, setAppFilter, keyFilter, setKeyFilter,
  availableApps, keys, loading, onRefresh, dataUpdatedAt,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo]     = useState("");

  const applyCustom = () => {
    const f = new Date(from), t = new Date(to);
    if (isNaN(f.getTime()) || isNaN(t.getTime()) || f >= t) return;
    setCustomRange({ from: f, to: t });
    setPreset("custom");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Time presets */}
      <div className="flex items-center h-8 border border-[var(--border)] rounded-md overflow-hidden bg-[var(--bg-elevated)]">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={cn(
              "px-3 h-full text-xs font-medium transition-colors border-r border-[var(--border)] last:border-r-0",
              preset === p.key
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            {p.label}
          </button>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors",
              preset === "custom"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            )}>
              <Calendar size={11} />
              {preset === "custom" && customRange
                ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d")}`
                : "Custom"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3 bg-[var(--bg-elevated)] border-[var(--border)] space-y-3">
            <p className="text-xs font-semibold">Custom Range</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase">From</label>
                <Input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
              <div>
                <label className="text-[10px] text-[var(--text-muted)] uppercase">To</label>
                <Input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={applyCustom}>Apply</Button>
              <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* App filter */}
      <Select value={appFilter} onValueChange={setAppFilter}>
        <SelectTrigger className="h-8 w-32 text-xs bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectValue placeholder="All Apps" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectItem value="all" className="text-xs">All Apps</SelectItem>
          {availableApps.map(app => (
            <SelectItem key={app} value={app} className="text-xs">{app}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Key filter */}
      <Select value={keyFilter} onValueChange={setKeyFilter}>
        <SelectTrigger className="h-8 w-40 text-xs bg-[var(--bg-elevated)] border-[var(--border)]">
          <SelectValue placeholder="All Keys" />
        </SelectTrigger>
        <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)] max-h-60">
          <SelectItem value="all" className="text-xs">All Keys</SelectItem>
          {keys.map(k => (
            <SelectItem key={k.key} value={k.key} className="text-xs font-mono">
              {k.username} · {maskString(k.key, 6)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 ml-auto">
        {dataUpdatedAt > 0 && (
          <span className="text-[10px] text-[var(--text-muted)]">
            Updated {format(dataUpdatedAt, "HH:mm:ss")}
          </span>
        )}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onRefresh} disabled={loading}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </Button>
      </div>
    </div>
  );
};
```

---

## 6. Charts

### 6.1 Credit Usage Over Time (Area)

```tsx
// src/pages/usage/charts/CreditUsageChart.tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const CreditUsageChart = ({ data }: { data: { label: string; credits: number }[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
      <defs>
        <linearGradient id="creditUsageGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.35} />
          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
      <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
      <Tooltip
        contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11, color: "var(--text-primary)" }}
        formatter={(v: number) => [`${v} credits`, "Used"]}
      />
      <Area type="monotone" dataKey="credits" stroke="#7C3AED" strokeWidth={1.5} fill="url(#creditUsageGrad)" dot={false} activeDot={{ r: 3 }} />
    </AreaChart>
  </ResponsiveContainer>
);
```

### 6.2 Credits by App (Donut)

```tsx
// src/pages/usage/charts/CreditsByAppChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const CreditsByAppChart = ({ data }: { data: { name: string; value: number; color: string }[] }) => {
  if (!data.length) return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">No usage in this range</div>
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="42%" innerRadius="55%" outerRadius="75%" paddingAngle={2} dataKey="value">
          {data.map(d => <Cell key={d.name} fill={d.color} fillOpacity={0.9} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11 }}
          formatter={(v: number, name: string) => [`${v} credits`, name]}
        />
        <Legend wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }} iconSize={8} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

### 6.3 Token Usage Stacked Area (Input vs Output)

```tsx
// src/pages/usage/charts/TokenUsageChart.tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export const TokenUsageChart = ({ data }: { data: { label: string; input: number; output: number }[] }) => {
  if (!data.length) return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
      Connect Langfuse in Settings to see token-level usage
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11 }}
          formatter={(v: number, name: string) => [v.toLocaleString(), name === "input" ? "Input tokens" : "Output tokens"]}
        />
        <Legend wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }} iconSize={8} iconType="circle" />
        <Area type="monotone" dataKey="input"  stackId="1" stroke="#3B82F6" fill="url(#inputGrad)"  strokeWidth={1.5} name="Input" />
        <Area type="monotone" dataKey="output" stackId="1" stroke="#10B981" fill="url(#outputGrad)" strokeWidth={1.5} name="Output" />
      </AreaChart>
    </ResponsiveContainer>
  );
};
```

### 6.4 Model Cost Table

```tsx
// src/pages/usage/charts/ModelCostList.tsx
const fmtTok = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

export const ModelCostList = ({ data }: { data: { model: string; tokens: number; cost: number }[] }) => {
  if (!data.length) return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
      No model cost data — connect Langfuse
    </div>
  );
  const maxCost = Math.max(...data.map(d => d.cost));
  return (
    <div className="space-y-2.5">
      {data.map(row => (
        <div key={row.model}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[var(--text-primary)] font-medium truncate">{row.model}</span>
            <span className="font-mono text-[var(--text-secondary)]">${row.cost.toFixed(5)}</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all"
              style={{ width: `${maxCost > 0 ? (row.cost / maxCost) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{fmtTok(row.tokens)} tokens</p>
        </div>
      ))}
    </div>
  );
};
```

### 6.5 Hourly Burn Heatmap

```tsx
// src/pages/usage/charts/HourlyBurnHeatmap.tsx
export const HourlyBurnHeatmap = ({ data }: { data: { hour: number; credits: number; requests: number; intensity: number }[] }) => (
  <div>
    <div className="flex gap-1">
      {data.map(slot => (
        <div key={slot.hour} className="flex-1 min-w-0 group relative" title={`${String(slot.hour).padStart(2,"0")}:00`}>
          <div
            className="h-9 rounded-sm transition-all"
            style={{ backgroundColor: `rgba(124, 58, 237, ${0.08 + slot.intensity * 0.85})` }}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
            <div className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] whitespace-nowrap shadow-md">
              <p className="font-semibold">{String(slot.hour).padStart(2,"0")}:00</p>
              <p>{slot.credits.toFixed(1)} credits</p>
              <p>{slot.requests} requests</p>
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="flex gap-1 mt-1">
      {data.map(slot => (
        <div key={slot.hour} className="flex-1 text-center text-[9px] text-[var(--text-muted)]">
          {slot.hour % 6 === 0 ? `${String(slot.hour).padStart(2,"0")}h` : ""}
        </div>
      ))}
    </div>
  </div>
);
```

---

## 7. Per-Key Usage Table

**`src/pages/usage/PerKeyUsageTable.tsx`**

```tsx
import { AdminTable } from "@/components/shared/AdminTable";
import { CopyField } from "@/components/shared/CopyField";
import { relativeTime, fullTime } from "@/lib/utils";

interface Row {
  apiKey: string; username: string; requests: number;
  credits: number; lastUsed: string | null; remaining: number | null;
}

export const PerKeyUsageTable = ({ data, loading }: { data: Row[]; loading: boolean }) => {
  const columns = [
    { key: "username", header: "Key", width: "180px",
      cell: (r: Row) => (
        <div>
          <p className="text-xs font-medium text-[var(--text-primary)]">{r.username}</p>
          <CopyField value={r.apiKey} showLast={8} className="text-[10px]" />
        </div>
      )},
    { key: "requests", header: "Requests", align: "right" as const, width: "90px",
      cell: (r: Row) => <span className="font-mono text-xs">{r.requests.toLocaleString()}</span> },
    { key: "credits", header: "Credits Used", align: "right" as const, width: "110px",
      cell: (r: Row) => <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">{r.credits.toLocaleString()}</span> },
    { key: "avgPerReq", header: "Avg / Req", align: "right" as const, width: "90px",
      cell: (r: Row) => <span className="font-mono text-xs text-[var(--text-secondary)]">{r.requests > 0 ? (r.credits / r.requests).toFixed(2) : "0"}</span> },
    { key: "remaining", header: "Remaining Budget", align: "right" as const, width: "120px",
      cell: (r: Row) => r.remaining != null
        ? <span className="font-mono text-xs text-[var(--text-secondary)]">${r.remaining.toFixed(2)}</span>
        : <span className="text-[var(--text-muted)]">—</span> },
    { key: "lastUsed", header: "Last Activity", width: "120px",
      cell: (r: Row) => r.lastUsed
        ? <span className="text-xs text-[var(--text-secondary)]" title={fullTime(r.lastUsed)}>{relativeTime(r.lastUsed)}</span>
        : <span className="text-[var(--text-muted)]">—</span> },
  ];

  return (
    <AdminTable
      columns={columns}
      data={data}
      rowKey={r => r.apiKey}
      loading={loading}
      emptyMessage="No key usage in this range"
    />
  );
};
```

---

## 8. Chart Card Wrapper (Reuse from Analytics page if available)

```tsx
// src/pages/usage/UsageCard.tsx — same pattern as analytics/ChartCard.tsx
import { cn } from "@/lib/utils";

interface Props {
  title: string; subtitle?: string; children: React.ReactNode;
  height?: number | "auto"; loading?: boolean; className?: string;
}

export const UsageCard = ({ title, subtitle, children, height = 240, loading, className }: Props) => (
  <div className={cn("border border-[var(--card-border)] rounded-md bg-[var(--card-bg)] admin-card p-3", className)}>
    <div className="mb-3">
      <p className="text-xs font-semibold text-[var(--text-primary)]">{title}</p>
      {subtitle && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
    </div>
    <div style={{ height: height === "auto" ? undefined : height }}>
      {loading
        ? <div className="w-full h-full bg-[var(--bg-elevated)] rounded animate-pulse" />
        : children}
    </div>
  </div>
);
```

---

## 9. Full Page Assembly

**`src/pages/Usage.tsx`**

```tsx
import { useUsageData } from "@/hooks/useUsageData";
import { PageHeader }      from "@/components/shared/PageHeader";
import { UsageFilterBar }  from "./usage/UsageFilterBar";
import { UsageKpis }       from "./usage/UsageKpis";
import { UsageCard }       from "./usage/UsageCard";
import { CreditUsageChart }    from "./usage/charts/CreditUsageChart";
import { CreditsByAppChart }   from "./usage/charts/CreditsByAppChart";
import { TokenUsageChart }     from "./usage/charts/TokenUsageChart";
import { ModelCostList }       from "./usage/charts/ModelCostList";
import { HourlyBurnHeatmap }   from "./usage/charts/HourlyBurnHeatmap";
import { PerKeyUsageTable }    from "./usage/PerKeyUsageTable";

export default function UsagePage() {
  const u = useUsageData();

  return (
    <div className="space-y-3">
      <PageHeader
        title="Usage Overview"
        subtitle={`${u.presetLabel} · ${u.totalRequests.toLocaleString()} requests`}
      />

      <UsageFilterBar
        preset={u.preset} setPreset={u.setPreset}
        customRange={u.customRange} setCustomRange={u.setCustomRange}
        appFilter={u.appFilter} setAppFilter={u.setAppFilter}
        keyFilter={u.keyFilter} setKeyFilter={u.setKeyFilter}
        availableApps={u.availableApps} keys={u.keys}
        loading={u.loading} onRefresh={u.refetch} dataUpdatedAt={u.dataUpdatedAt}
      />

      <UsageKpis
        totalCredits={u.totalCredits}
        totalRequests={u.totalRequests}
        tokenStats={u.tokenStats}
        langfuseConfigured={u.langfuseConfigured}
        loading={u.loading}
      />

      {/* Row 1: Credit usage over time + by app */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <UsageCard title="Credit Usage Over Time" subtitle="Total credits deducted per period" className="lg:col-span-2" height={240} loading={u.loading}>
          <CreditUsageChart data={u.creditTimeSeries} />
        </UsageCard>
        <UsageCard title="Credits by App" height={240} loading={u.loading}>
          <CreditsByAppChart data={u.creditsByApp} />
        </UsageCard>
      </div>

      {/* Row 2: Per-key table */}
      <UsageCard title="Usage by API Key" subtitle="Sorted by credits used, descending" height="auto" loading={u.loading}>
        <PerKeyUsageTable data={u.perKeyUsage} loading={u.loading} />
      </UsageCard>

      {/* Row 3: Token usage + model cost (Langfuse-dependent) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <UsageCard
          title="Token Usage Over Time"
          subtitle="Input vs output tokens, daily"
          className="lg:col-span-2"
          height={240}
          loading={u.langfuseLoading}
        >
          <TokenUsageChart data={u.tokenTimeSeries} />
        </UsageCard>
        <UsageCard title="Cost by Model" height={240} loading={u.langfuseLoading}>
          <ModelCostList data={u.modelCosts} />
        </UsageCard>
      </div>

      {/* Row 4: Hourly heatmap */}
      <UsageCard title="Hourly Burn Pattern" subtitle="Credit usage by hour of day, all days in range combined" height={90} loading={u.loading}>
        <HourlyBurnHeatmap data={u.hourlyBurn} />
      </UsageCard>

      {!u.langfuseConfigured && (
        <p className="text-[11px] text-[var(--text-muted)] text-center py-2">
          Token and model cost charts require Langfuse — <a href="/settings" className="text-[var(--accent)] hover:underline">configure it in Settings</a>
        </p>
      )}
    </div>
  );
}
```

---

## 10. Sidebar + Routing

```tsx
// src/components/layout/Sidebar.tsx — add to OVERVIEW group, right after Dashboard:
import { Gauge } from "lucide-react";

{ to: "/usage", label: "Usage", icon: Gauge }
```

```tsx
// src/main.tsx
import UsagePage from "@/pages/Usage";
<Route path="usage" element={<UsagePage />} />
```

---

## 11. Acceptance Checklist

**Zero-interaction default**
- [ ] Navigating to `/usage` immediately shows last 24h data with no clicks required
- [ ] All 5 KPI cards populate without any filter interaction
- [ ] Page title/subtitle reads "Last 24 hours · N requests" by default

**KPIs**
- [ ] Total Credits Used matches manual sum from Logs page for same range (cross-check)
- [ ] Total Tokens shows "—" gracefully when Langfuse isn't configured, real number when it is
- [ ] Input/Output split percentage is correct
- [ ] Avg Credits/Request computes correctly, shows "0" not NaN when zero requests

**Charts**
- [ ] Credit Usage Over Time switches between hourly/daily buckets correctly at the 72h threshold
- [ ] Credits by App donut shows "No usage in this range" empty state correctly
- [ ] Token Usage chart shows helpful message instead of blank chart when Langfuse not configured
- [ ] Model Cost list bars scale relative to the highest-cost model
- [ ] Hourly heatmap tooltip shows exact hour, credits, and request count on hover

**Per-key table**
- [ ] Sorted by credits descending by default
- [ ] Avg/Req column computes correctly per row
- [ ] Remaining budget pulled correctly from `/admin/keys` data, shows "—" for unknown keys
- [ ] Last Activity shows relative time with full timestamp on hover

**Filters**
- [ ] Time presets (1h/6h/24h/7d/30d) all update every chart and KPI
- [ ] Custom range picker works and switches preset to "custom"
- [ ] App filter narrows all data correctly
- [ ] Key filter narrows all data correctly, including KPIs
- [ ] Combining App + Key filters works (AND logic, not OR)
- [ ] Refresh button reloads logs and keys data

**Langfuse graceful degradation**
- [ ] Page is fully functional and useful with zero Langfuse config — only token/model sections show fallback messaging
- [ ] When Langfuse is configured, token/model sections populate correctly
- [ ] Langfuse calls route through the existing `langfuseGate` — verify no new uncontrolled fetch calls introduced
- [ ] Footer message about connecting Langfuse only shows when not configured

---

*End of Usage Overview Page Implementation Plan*  
*Qwint Admin Panel*
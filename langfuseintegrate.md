# Langfuse Dashboard — Full Implementation Guide

Complete mapping of every chart/widget on the Langfuse Home dashboard to the API endpoints that power them, plus a working implementation for each.

---

## Authentication

All requests use **HTTP Basic Auth**.

```ts
// lib/langfuse.ts
import axios from "axios";

export const langfuse = axios.create({
  baseURL: import.meta.env.VITE_LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com/api/public",
  auth: {
    username: import.meta.env.VITE_LANGFUSE_PUBLIC_KEY,
    password: import.meta.env.VITE_LANGFUSE_SECRET_KEY,
  },
});
```

```env
VITE_LANGFUSE_PUBLIC_KEY=pk-lf-...
VITE_LANGFUSE_SECRET_KEY=sk-lf-...
VITE_LANGFUSE_BASE_URL=https://cloud.langfuse.com/api/public
```

---

## Widget → API Mapping

| Widget | API Endpoint | Method | Notes |
|--------|-------------|--------|-------|
| **Total traces** count | `/traces` | GET | Read `meta.totalItems` |
| **Traces by name** bar chart | `/traces` | GET | Group client-side by `name` |
| **Model costs** table | `/v2/metrics` | GET | `view=observations`, dim=`providedModelName` |
| **Total cost** number | `/v2/metrics` | GET | sum of `totalCost` across all models |
| **Scores count** | `/scores` | GET | Read `meta.totalItems` |
| **Observations by time** line chart | `/v2/metrics` | GET | `view=observations`, dim=`time`, granularity=`hour` |
| **Observations by level** (DEFAULT etc.) | `/observations` | GET | Group client-side by `level` |
| **Total observations** count | `/observations` | GET | Read `meta.totalItems` |
| **Cost by model over time** | `/v2/metrics` | GET | `view=observations`, dim=`time`+`providedModelName` |
| **Usage by model over time** | `/v2/metrics` | GET | `view=observations`, dim=`time`+`providedModelName`, metric=`totalTokens` |
| **User consumption** (cost per user) | `/v2/metrics` | GET | `view=traces`, dim=`userId`, metric=`totalCost` |
| **Trace latency percentiles** | `/traces` | GET | Compute p50/p90/p95/p99 client-side from `latency` field |
| **Generation latency percentiles** | `/observations` | GET | Filter `type=GENERATION`, compute percentiles |
| **Observation latency percentiles** | `/observations` | GET | Filter `type=SPAN`, group by `name` |
| **Model latencies over time** | `/v2/metrics` | GET | `view=observations`, dim=`time`+`providedModelName`, metric=`latency` |
| **Scores analytics** | `/scores` | GET | Group by `name`, compute moving avg |

> **Note:** `/v2/metrics` is **Langfuse Cloud only**. On self-hosted, replace with aggregation over `/observations` responses.

---

## Time Range Helper

```ts
// lib/timeRange.ts
export type Range = "1d" | "7d" | "30d";

export function getRange(range: Range) {
  const to = new Date();
  const from = new Date();
  const days = range === "1d" ? 1 : range === "7d" ? 7 : 30;
  from.setDate(from.getDate() - days);
  return {
    fromTimestamp: from.toISOString(),
    toTimestamp: to.toISOString(),
  };
}
```

---

## 1. Total Traces + Traces by Name

```ts
// hooks/useTraces.ts
import { useQuery } from "@tanstack/react-query";
import { langfuse } from "@/lib/langfuse";
import { getRange } from "@/lib/timeRange";

export function useTraces(range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["traces", range],
    queryFn: async () => {
      // Fetch enough to cover all trace names; paginate if needed
      const { data } = await langfuse.get("/traces", {
        params: {
          fromTimestamp,
          toTimestamp,
          limit: 100,
          page: 1,
        },
      });

      const traces: any[] = data.data;
      const totalItems: number = data.meta.totalItems;

      // Group by name for bar chart
      const byName: Record<string, number> = {};
      for (const t of traces) {
        byName[t.name ?? "unknown"] = (byName[t.name ?? "unknown"] ?? 0) + 1;
      }

      return { totalItems, byName, traces };
    },
    staleTime: 60_000,
  });
}
```

```tsx
// components/TotalTraces.tsx
import { useTraces } from "@/hooks/useTraces";
import { DataCard } from "@/components/ui/DataCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function TotalTraces({ range }: { range: string }) {
  const { data, isLoading } = useTraces(range);

  const chartData = Object.entries(data?.byName ?? {})
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      <DataCard label="Total traces tracked" value={isLoading ? "…" : data?.totalItems ?? 0} />

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#378ADD" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## 2. Model Costs Table + Total Cost

```ts
// hooks/useModelCosts.ts
import { useQuery } from "@tanstack/react-query";
import { langfuse } from "@/lib/langfuse";
import { getRange } from "@/lib/timeRange";

export function useModelCosts(range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["modelCosts", range],
    queryFn: async () => {
      const { data } = await langfuse.get("/v2/metrics", {
        params: {
          query: JSON.stringify({
            view: "observations",
            metrics: [
              { measure: "totalCost", aggregation: "sum" },
              { measure: "totalTokens", aggregation: "sum" },
            ],
            dimensions: [{ field: "providedModelName" }],
            filters: [],
            fromTimestamp,
            toTimestamp,
          }),
        },
      });

      type Row = { providedModelName: string; totalCost: number; totalTokens: number };
      const rows: Row[] = data.data ?? [];
      const totalCost = rows.reduce((s, r) => s + (r.totalCost ?? 0), 0);

      return { rows, totalCost };
    },
    staleTime: 60_000,
  });
}
```

```tsx
// components/ModelCostsTable.tsx
import { useModelCosts } from "@/hooks/useModelCosts";

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return String(n);
}

export function ModelCostsTable({ range }: { range: string }) {
  const { data, isLoading } = useModelCosts(range);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">
        Total cost: <span className="font-medium text-foreground">
          ${data?.totalCost?.toFixed(6) ?? "—"}
        </span>
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th className="text-left py-1 font-medium">Model</th>
            <th className="text-right py-1 font-medium">Tokens</th>
            <th className="text-right py-1 font-medium">USD</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr><td colSpan={3} className="py-4 text-center text-muted-foreground text-xs">Loading…</td></tr>
          )}
          {data?.rows.map((row) => (
            <tr key={row.providedModelName} className="border-b last:border-0">
              <td className="py-1.5 font-mono text-xs">{row.providedModelName}</td>
              <td className="py-1.5 text-right text-xs">{fmtTokens(row.totalTokens)}</td>
              <td className="py-1.5 text-right text-xs">${row.totalCost?.toFixed(6)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 3. Observations by Time (Line Chart)

```ts
// hooks/useObservationsByTime.ts
import { useQuery } from "@tanstack/react-query";
import { langfuse } from "@/lib/langfuse";
import { getRange } from "@/lib/timeRange";

export function useObservationsByTime(range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["obsByTime", range],
    queryFn: async () => {
      const { data } = await langfuse.get("/v2/metrics", {
        params: {
          query: JSON.stringify({
            view: "observations",
            metrics: [{ measure: "countObservations", aggregation: "count" }],
            dimensions: [{ field: "time", granularity: "hour" }],
            filters: [],
            fromTimestamp,
            toTimestamp,
          }),
        },
      });

      return (data.data ?? []).map((d: any) => ({
        time: new Date(d.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        count: d.countObservations ?? 0,
      }));
    },
    staleTime: 60_000,
  });
}
```

```tsx
// components/ObsByTimeChart.tsx
import { useObservationsByTime } from "@/hooks/useObservationsByTime";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function ObsByTimeChart({ range }: { range: string }) {
  const { data = [] } = useObservationsByTime(range);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Line type="monotone" dataKey="count" stroke="#378ADD" dot={false} strokeWidth={1.5} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## 4. Observations Total + By Level

```ts
// hooks/useObservations.ts
import { useQuery } from "@tanstack/react-query";
import { langfuse } from "@/lib/langfuse";
import { getRange } from "@/lib/timeRange";

export function useObservations(range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["observations", range],
    queryFn: async () => {
      const { data } = await langfuse.get("/observations", {
        params: { fromStartTime: fromTimestamp, toStartTime: toTimestamp, limit: 100, page: 1 },
      });

      const obs: any[] = data.data ?? [];
      const totalItems: number = data.meta.totalItems;

      const byLevel: Record<string, number> = {};
      for (const o of obs) {
        const lvl = o.level ?? "DEFAULT";
        byLevel[lvl] = (byLevel[lvl] ?? 0) + 1;
      }

      return { totalItems, byLevel };
    },
    staleTime: 60_000,
  });
}
```

---

## 5. Cost by Model Over Time

```ts
// hooks/useCostOverTime.ts
import { useQuery } from "@tanstack/react-query";
import { langfuse } from "@/lib/langfuse";
import { getRange } from "@/lib/timeRange";

export function useCostOverTime(range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["costOverTime", range],
    queryFn: async () => {
      const { data } = await langfuse.get("/v2/metrics", {
        params: {
          query: JSON.stringify({
            view: "observations",
            metrics: [{ measure: "totalCost", aggregation: "sum" }],
            dimensions: [
              { field: "time", granularity: "hour" },
              { field: "providedModelName" },
            ],
            filters: [],
            fromTimestamp,
            toTimestamp,
          }),
        },
      });
      return data.data ?? [];
    },
    staleTime: 60_000,
  });
}
```

The raw data is `[{ time, providedModelName, totalCost }]` — pivot by model then feed into recharts `LineChart` with one `<Line>` per model.

---

## 6. User Consumption

```ts
// hooks/useUserConsumption.ts
import { useQuery } from "@tanstack/react-query";
import { langfuse } from "@/lib/langfuse";
import { getRange } from "@/lib/timeRange";

export function useUserConsumption(range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["userConsumption", range],
    queryFn: async () => {
      const { data } = await langfuse.get("/v2/metrics", {
        params: {
          query: JSON.stringify({
            view: "traces",
            metrics: [
              { measure: "totalCost", aggregation: "sum" },
              { measure: "countTraces", aggregation: "count" },
            ],
            dimensions: [{ field: "userId" }],
            filters: [],
            fromTimestamp,
            toTimestamp,
          }),
        },
      });

      return (data.data ?? [])
        .filter((d: any) => d.userId)
        .sort((a: any, b: any) => b.totalCost - a.totalCost)
        .slice(0, 20);
    },
    staleTime: 60_000,
  });
}
```

---

## 7. Latency Percentiles

```ts
// hooks/useLatencyPercentiles.ts
import { useQuery } from "@tanstack/react-query";
import { langfuse } from "@/lib/langfuse";
import { getRange } from "@/lib/timeRange";

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// For traces
export function useTraceLatencies(range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["traceLatencies", range],
    queryFn: async () => {
      const { data } = await langfuse.get("/traces", {
        params: { fromTimestamp, toTimestamp, limit: 100 },
      });

      const traces: any[] = data.data ?? [];

      // Group by name
      const byName: Record<string, number[]> = {};
      for (const t of traces) {
        const name = t.name ?? "unknown";
        if (!byName[name]) byName[name] = [];
        if (t.latency != null) byName[name].push(t.latency);
      }

      return Object.entries(byName).map(([name, latencies]) => ({
        name,
        p50: percentile(latencies, 50),
        p90: percentile(latencies, 90),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
      }));
    },
    staleTime: 60_000,
  });
}

// For observations (generations + spans)
export function useObservationLatencies(range = "1d", type: "GENERATION" | "SPAN" = "GENERATION") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["obsLatencies", range, type],
    queryFn: async () => {
      const { data } = await langfuse.get("/observations", {
        params: { fromStartTime: fromTimestamp, toStartTime: toTimestamp, type, limit: 100 },
      });

      const obs: any[] = data.data ?? [];

      const byName: Record<string, number[]> = {};
      for (const o of obs) {
        const name = o.name ?? o.model ?? "unknown";
        if (!byName[name]) byName[name] = [];
        // latency in ms from endTime - startTime
        if (o.startTime && o.endTime) {
          byName[name].push(
            (new Date(o.endTime).getTime() - new Date(o.startTime).getTime()) / 1000
          );
        }
      }

      return Object.entries(byName).map(([name, latencies]) => ({
        name,
        p50: percentile(latencies, 50),
        p90: percentile(latencies, 90),
        p95: percentile(latencies, 95),
        p99: percentile(latencies, 99),
      }));
    },
    staleTime: 60_000,
  });
}
```

```tsx
// components/LatencyTable.tsx
type LatencyRow = { name: string; p50: number; p90: number; p95: number; p99: number };

function fmt(s: number) {
  return s > 0 ? `${s.toFixed(2)}s` : "-";
}

export function LatencyTable({ rows }: { rows: LatencyRow[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-muted-foreground border-b">
          <th className="text-left py-1.5 font-medium">Name</th>
          <th className="text-right py-1.5 font-medium">p50</th>
          <th className="text-right py-1.5 font-medium">p90</th>
          <th className="text-right py-1.5 font-medium">p95</th>
          <th className="text-right py-1.5 font-medium">p99</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name} className="border-b last:border-0">
            <td className="py-1.5 font-mono truncate max-w-[140px]">{r.name}</td>
            <td className="py-1.5 text-right">{fmt(r.p50)}</td>
            <td className="py-1.5 text-right">{fmt(r.p90)}</td>
            <td className="py-1.5 text-right">{fmt(r.p95)}</td>
            <td className="py-1.5 text-right">{fmt(r.p99)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 8. Scores Count + Analytics

```ts
// hooks/useScores.ts
import { useQuery } from "@tanstack/react-query";
import { langfuse } from "@/lib/langfuse";
import { getRange } from "@/lib/timeRange";

export function useScores(range = "1d") {
  const { fromTimestamp, toTimestamp } = getRange(range);

  return useQuery({
    queryKey: ["scores", range],
    queryFn: async () => {
      const { data } = await langfuse.get("/scores", {
        params: { fromTimestamp, toTimestamp, limit: 1, page: 1 },
      });
      return { totalItems: data.meta.totalItems };
    },
    staleTime: 60_000,
  });
}
```

---

## 9. Full Dashboard Page

```tsx
// pages/LangfuseDashboard.tsx
import { useState } from "react";
import { TotalTraces } from "@/components/TotalTraces";
import { ModelCostsTable } from "@/components/ModelCostsTable";
import { ObsByTimeChart } from "@/components/ObsByTimeChart";
import { LatencyTable } from "@/components/LatencyTable";
import { useScores } from "@/hooks/useScores";
import { useObservations } from "@/hooks/useObservations";
import { useTraceLatencies, useObservationLatencies } from "@/hooks/useLatencyPercentiles";
import { DataCard } from "@/components/ui/DataCard";

type Range = "1d" | "7d" | "30d";

export function LangfuseDashboard() {
  const [range, setRange] = useState<Range>("1d");

  const { data: scores } = useScores(range);
  const { data: obs } = useObservations(range);
  const { data: traceLatencies = [] } = useTraceLatencies(range);
  const { data: genLatencies = [] } = useObservationLatencies(range, "GENERATION");
  const { data: spanLatencies = [] } = useObservationLatencies(range, "SPAN");

  return (
    <div className="space-y-6 p-6">
      {/* Header + range picker */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">LLM Observability</h1>
        <div className="flex gap-1">
          {(["1d", "7d", "30d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                range === r
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Traces + Model Costs + Scores */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-medium">Traces</h2>
          <TotalTraces range={range} />
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">Model costs</h2>
          <ModelCostsTable range={range} />
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">Scores</h2>
          <DataCard label="Total scores tracked" value={scores?.totalItems ?? 0} />
        </div>
      </div>

      {/* Row 2: Observations over time */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Observations by time</h2>
          <DataCard label="Observations tracked" value={obs?.totalItems ?? 0} inline />
        </div>
        <ObsByTimeChart range={range} />
      </div>

      {/* Row 3: Latency tables */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">Trace latency percentiles</h2>
          <LatencyTable rows={traceLatencies} />
        </div>
        <div className="border rounded-lg p-4">
          <h2 className="text-sm font-medium mb-3">Generation latency percentiles</h2>
          <LatencyTable rows={genLatencies} />
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-sm font-medium mb-3">Observation latency percentiles</h2>
        <LatencyTable rows={spanLatencies} />
      </div>
    </div>
  );
}
```

---

## Fallback for Self-Hosted (no /v2/metrics)

If `/v2/metrics` returns 404, fetch `/observations` in pages and aggregate locally:

```ts
async function getModelCostsFallback(fromTimestamp: string, toTimestamp: string) {
  let page = 1;
  const all: any[] = [];

  while (true) {
    const { data } = await langfuse.get("/observations", {
      params: { fromStartTime: fromTimestamp, toStartTime: toTimestamp, type: "GENERATION", limit: 100, page },
    });
    all.push(...(data.data ?? []));
    if (all.length >= data.meta.totalItems) break;
    page++;
  }

  const byModel: Record<string, { tokens: number; cost: number }> = {};
  for (const o of all) {
    const model = o.model ?? "unknown";
    if (!byModel[model]) byModel[model] = { tokens: 0, cost: 0 };
    byModel[model].tokens += (o.usage?.totalTokens ?? 0);
    byModel[model].cost += (o.calculatedTotalCost ?? 0);
  }

  return Object.entries(byModel).map(([model, v]) => ({
    providedModelName: model,
    totalTokens: v.tokens,
    totalCost: v.cost,
  }));
}
```

---

## Quick Reference

| Hook | Endpoint | Key response fields |
|------|----------|-------------------|
| `useTraces` | `GET /traces` | `data.data[]`, `data.meta.totalItems` |
| `useModelCosts` | `GET /v2/metrics` | `data.data[].totalCost`, `.totalTokens`, `.providedModelName` |
| `useObservationsByTime` | `GET /v2/metrics` | `data.data[].time`, `.countObservations` |
| `useObservations` | `GET /observations` | `data.data[].level`, `data.meta.totalItems` |
| `useCostOverTime` | `GET /v2/metrics` | `data.data[].time`, `.providedModelName`, `.totalCost` |
| `useUserConsumption` | `GET /v2/metrics` | `data.data[].userId`, `.totalCost`, `.countTraces` |
| `useTraceLatencies` | `GET /traces` | `data.data[].latency` (ms, compute percentiles) |
| `useObservationLatencies` | `GET /observations` | `data.data[].startTime`, `.endTime` (compute diff) |
| `useScores` | `GET /scores` | `data.meta.totalItems` |
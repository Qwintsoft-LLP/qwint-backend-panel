# Qwint Talk Admin Panel — Langfuse Integration
## Implementation Plan v1.0.0
**Route:** `/api-keys` (inline drill-down) + `/langfuse` (full page)  
**Audience:** Frontend Engineer  
**Context:** Backend already passes `api_key` as `userId` and `reqc-id` as `sessionId` to Langfuse on every request. The admin panel will query Langfuse directly from the frontend using the public REST API.

---

## 0. Mental Model Before Writing a Line

### How your data maps to Langfuse

```
Your System             →    Langfuse Concept
────────────────────────────────────────────────────
API Key (sk-xxx)        →    userId
reqc-xxx (request ID)   →    sessionId
Each LLM call           →    Trace (+ Observations inside it)
```

So:
- **"Show me everything for API key `sk-abc123`"** → query Langfuse traces filtered by `userId=sk-abc123`
- **"Show me what happened in request `reqc-071b`"** → query Langfuse sessions filtered by `sessionId=reqc-071b`, then get all traces in that session
- **"How much did this key cost in LLM tokens?"** → sum `totalCost` across all traces where `userId=sk-abc123`

The admin panel never touches Langfuse ingestion. Read-only. All calls use HTTP Basic Auth with `LANGFUSE_PUBLIC_KEY:LANGFUSE_SECRET_KEY`.

### Langfuse API endpoints we use

```
GET /api/public/traces
  ?userId=<api_key>          ← filter by API key
  ?sessionId=<reqc_id>       ← filter by request ID
  ?page=1&limit=50

GET /api/public/traces/:traceId
  Full trace with all observations nested

GET /api/public/sessions
  ?userId=<api_key>

GET /api/public/observations
  ?traceId=<traceId>
  ?userId=<api_key>
  ?type=GENERATION            ← only LLM calls

GET /api/public/metrics/daily
  ?userId=<api_key>           ← per-key cost/usage over time

GET /api/public/v2/observations
  ?userId=<api_key>           ← high-perf v2 endpoint
```

Auth: `Authorization: Basic base64(PUBLIC_KEY:SECRET_KEY)`

---

## 1. Settings Page: Add Langfuse Config

Before anything else, Langfuse credentials must be stored. Add to the existing Settings page.

### 1.1 Storage keys

Add to `src/lib/storage.ts`:

```ts
const KEYS = {
  // ...existing keys
  LANGFUSE_HOST:       "qw_langfuse_host",       // e.g. https://cloud.langfuse.com
  LANGFUSE_PUBLIC_KEY: "qw_langfuse_public_key",  // pk-lf-...
  LANGFUSE_SECRET_KEY: "qw_langfuse_secret_key",  // sk-lf-...
} as const;

export const getLangfuseSettings = () => ({
  host:      storage.get(KEYS.LANGFUSE_HOST)       || "https://cloud.langfuse.com",
  publicKey: storage.get(KEYS.LANGFUSE_PUBLIC_KEY) || "",
  secretKey: storage.get(KEYS.LANGFUSE_SECRET_KEY) || "",
});

export const getLangfuseAuthHeader = (): string => {
  const { publicKey, secretKey } = getLangfuseSettings();
  if (!publicKey || !secretKey) return "";
  return "Basic " + btoa(`${publicKey}:${secretKey}`);
};
```

### 1.2 Settings page addition

```tsx
// In src/pages/Settings.tsx — add "Langfuse" section:

const LangfuseSettingsSection = () => {
  const [lf, setLf] = useState({
    host:      storage.get(KEYS.LANGFUSE_HOST)       || "https://cloud.langfuse.com",
    publicKey: storage.get(KEYS.LANGFUSE_PUBLIC_KEY) || "",
    secretKey: storage.get(KEYS.LANGFUSE_SECRET_KEY) || "",
  });
  const [showPk, setShowPk] = useState(false);
  const [showSk, setShowSk] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const toast = useToast();

  const saveLangfuse = () => {
    storage.set(KEYS.LANGFUSE_HOST,       lf.host);
    storage.set(KEYS.LANGFUSE_PUBLIC_KEY, lf.publicKey);
    storage.set(KEYS.LANGFUSE_SECRET_KEY, lf.secretKey);
    toast.success("Langfuse settings saved");
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const auth = "Basic " + btoa(`${lf.publicKey}:${lf.secretKey}`);
      const res  = await fetch(`${lf.host}/api/public/traces?limit=1`, {
        headers: { Authorization: auth },
      });
      setTestResult(res.ok ? "ok" : "fail");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="border-t border-[var(--border)] pt-5 mt-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-4">
        Langfuse Observability
      </p>
      <div className="space-y-3">
        <Field label="Host">
          <Input
            value={lf.host}
            onChange={e => setLf(p => ({ ...p, host: e.target.value }))}
            className="h-8 text-sm"
            placeholder="https://cloud.langfuse.com"
          />
        </Field>
        <Field label="Public Key">
          <SecretInput
            value={lf.publicKey}
            onChange={e => setLf(p => ({ ...p, publicKey: e.target.value }))}
            show={showPk}
            onToggle={() => setShowPk(p => !p)}
            placeholder="pk-lf-..."
          />
        </Field>
        <Field label="Secret Key">
          <SecretInput
            value={lf.secretKey}
            onChange={e => setLf(p => ({ ...p, secretKey: e.target.value }))}
            show={showSk}
            onToggle={() => setShowSk(p => !p)}
            placeholder="sk-lf-..."
          />
        </Field>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" className="h-8 text-xs" onClick={saveLangfuse}>
            Save Langfuse Config
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={testConnection}
            disabled={testing || !lf.publicKey || !lf.secretKey}
          >
            {testing ? "Testing..." : "Test Connection"}
          </Button>
          {testResult === "ok"   && <span className="text-xs text-[var(--success)]">✓ Connected</span>}
          {testResult === "fail" && <span className="text-xs text-[var(--error)]">✗ Failed — check keys</span>}
        </div>
      </div>
    </div>
  );
};
```

---

## 2. Langfuse API Client

A completely separate axios instance — never mixes with the backend client.

**`src/api/langfuse.ts`**

```ts
import axios from "axios";
import { getLangfuseSettings, getLangfuseAuthHeader } from "@/lib/storage";

// ── Separate axios instance — never uses backend baseURL or auth headers ──
export const langfuseClient = axios.create();

langfuseClient.interceptors.request.use(config => {
  const { host } = getLangfuseSettings();
  config.baseURL = host;
  config.headers["Authorization"] = getLangfuseAuthHeader();
  return config;
});

langfuseClient.interceptors.response.use(
  res => res,
  err => {
    const status  = err.response?.status;
    const message = err.response?.data?.message ?? err.message ?? "Langfuse error";
    return Promise.reject({ status, message, isLangfuse: true });
  }
);

// ── Types ──────────────────────────────────────────────────────────────────

export interface LfTrace {
  id:             string;
  timestamp:      string;
  name:           string | null;
  userId:         string | null;   // = your api_key
  sessionId:      string | null;   // = your reqc-id
  input:          unknown;
  output:         unknown;
  metadata:       Record<string, unknown> | null;
  tags:           string[];
  latency:        number | null;   // seconds
  totalCost:      number | null;   // USD
  usage: {
    input:        number | null;
    output:       number | null;
    total:        number | null;
    unit:         string | null;
  } | null;
}

export interface LfObservation {
  id:                  string;
  traceId:             string;
  type:                "GENERATION" | "SPAN" | "EVENT";
  name:                string | null;
  startTime:           string;
  endTime:             string | null;
  input:               unknown;
  output:              unknown;
  model:               string | null;
  modelParameters:     Record<string, unknown> | null;
  usage: {
    input:             number | null;
    output:            number | null;
    total:             number | null;
    unit:              string | null;
    inputCost:         number | null;
    outputCost:        number | null;
    totalCost:         number | null;
  } | null;
  latency:             number | null;
  statusMessage:       string | null;
  metadata:            Record<string, unknown> | null;
}

export interface LfSession {
  id:         string;
  createdAt:  string;
  projectId:  string;
  userIds:    string[];
  countTraces: number;
}

export interface LfDailyMetric {
  date:              string;
  countTraces:       number;
  countObservations: number;
  totalCost:         number;
  usage: {
    model:           string;
    inputUsage:      number;
    outputUsage:     number;
    totalUsage:      number;
    countTraces:     number;
    totalCost:       number;
  }[];
}

export interface LfPaginatedResponse<T> {
  data: T[];
  meta: {
    page:       number;
    limit:      number;
    totalItems: number;
    totalPages: number;
  };
}

// ── API functions ──────────────────────────────────────────────────────────

export const langfuseApi = {
  // All traces for an API key (userId = api_key)
  tracesByKey: (apiKey: string, page = 1, limit = 20) =>
    langfuseClient
      .get<LfPaginatedResponse<LfTrace>>("/api/public/traces", {
        params: { userId: apiKey, page, limit, orderBy: "timestamp.DESC" },
      })
      .then(r => r.data),

  // Single trace with full detail
  trace: (traceId: string) =>
    langfuseClient
      .get<LfTrace & { observations: LfObservation[] }>(`/api/public/traces/${traceId}`)
      .then(r => r.data),

  // All sessions for an API key
  sessionsByKey: (apiKey: string, page = 1, limit = 20) =>
    langfuseClient
      .get<LfPaginatedResponse<LfSession>>("/api/public/sessions", {
        params: { userId: apiKey, page, limit },
      })
      .then(r => r.data),

  // Single session (reqc-id) → all traces in it
  tracesBySession: (sessionId: string) =>
    langfuseClient
      .get<LfPaginatedResponse<LfTrace>>("/api/public/traces", {
        params: { sessionId, limit: 100 },
      })
      .then(r => r.data),

  // All observations (LLM calls) for an API key
  observationsByKey: (apiKey: string, page = 1, limit = 50) =>
    langfuseClient
      .get<LfPaginatedResponse<LfObservation>>("/api/public/observations", {
        params: { userId: apiKey, type: "GENERATION", page, limit },
      })
      .then(r => r.data),

  // All observations for a single trace
  observationsByTrace: (traceId: string) =>
    langfuseClient
      .get<LfPaginatedResponse<LfObservation>>("/api/public/observations", {
        params: { traceId, limit: 100 },
      })
      .then(r => r.data),

  // Daily cost + usage metrics for a key
  dailyMetrics: (apiKey: string, limit = 30) =>
    langfuseClient
      .get<{ data: LfDailyMetric[] }>("/api/public/metrics/daily", {
        params: { userId: apiKey, limit },
      })
      .then(r => r.data),
};
```

---

## 3. Sidebar — Add Langfuse Entry

```tsx
// In src/components/layout/Sidebar.tsx
// Add under SYSTEM group:

import { FlaskConical } from "lucide-react";

{ to: "/langfuse", label: "LLM Traces", icon: FlaskConical }
```

Add a small violet "LF" pill badge next to the label so it's visually distinct from system logs.

---

## 4. API Keys Page — Inline Langfuse Button

The primary entry point. Admin doesn't need a separate page — they click a button on an API key row and the Langfuse data slides in.

### 4.1 Add button to row actions

```tsx
// In RowActions dropdown in ApiKeys.tsx
<DropdownMenuItem
  onClick={() => navigate(`/langfuse?key=${encodeURIComponent(row.key)}`)}
  className="flex items-center gap-2"
>
  <FlaskConical size={12} />
  View LLM Traces
</DropdownMenuItem>
```

Also add a direct icon button in the row for fast access (no dropdown needed):

```tsx
// As a column in the keys table (before the ··· menu):
{
  key: "langfuse",
  header: "",
  width: "36px",
  cell: (r: ApiKey) => (
    <button
      onClick={e => {
        e.stopPropagation();
        navigate(`/langfuse?key=${encodeURIComponent(r.key)}`);
      }}
      className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
      title="View LLM traces in Langfuse"
    >
      <FlaskConical size={13} />
    </button>
  ),
},
```

---

## 5. Langfuse Page — Full Layout

**Route:** `/langfuse?key=<api_key>`

The `key` param pre-selects the API key. Without it, the page shows a key selector.

```
┌─────────────────────────────────────────────────────────────────────┐
│  LLM Traces                    [Key: sk-••••XXXX ▾]   [↗ Langfuse] │
├─────────────────────────────────────────────────────────────────────┤
│  [KPI Strip: Total Traces · Total Cost · Avg Latency · Total Tokens]│
├─────────────────────────────────────────────────────────────────────┤
│  [Daily Cost Chart — 30d]           [Model Usage Breakdown — Pie]   │
│       70%                                   30%                     │
├─────────────────────────────────────────────────────────────────────┤
│  Traces                                                             │
│  [Search: trace name/id]  [Date ▾]  [Status ▾]                     │
│  ─────────────────────────────────────────────────────────────────  │
│  [Traces Table — click row to expand observations]                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Key Selector Component

```tsx
// src/pages/langfuse/KeySelector.tsx
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskString } from "@/lib/utils";

interface Props {
  value:    string;
  onChange: (key: string) => void;
}

export const KeySelector = ({ value, onChange }: Props) => {
  const { data: keys = [] } = useQuery({
    queryKey: ["admin-keys"],
    queryFn:  adminApi.listKeys,
    staleTime: 5 * 60_000,
  });

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-64 text-xs font-mono bg-[var(--bg-elevated)] border-[var(--border)]">
        <SelectValue placeholder="Select API key..." />
      </SelectTrigger>
      <SelectContent className="bg-[var(--bg-elevated)] border-[var(--border)] max-h-60">
        {keys.map(k => (
          <SelectItem key={k.key} value={k.key} className="text-xs font-mono">
            <span className="text-[var(--text-secondary)]">{k.username}</span>
            <span className="ml-2 text-[var(--text-muted)]">{maskString(k.key, 8)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

---

## 7. Langfuse KPI Strip

```tsx
// src/pages/langfuse/LangfuseKpis.tsx
import { DollarSign, Clock, Hash, Layers } from "lucide-react";

interface Props {
  traces:       number;
  totalCost:    number;
  avgLatency:   number;   // seconds
  totalTokens:  number;
  loading:      boolean;
}

export const LangfuseKpis = ({ traces, totalCost, avgLatency, totalTokens, loading }: Props) => {
  const items = [
    {
      icon:  <Layers size={13} />,
      label: "Total Traces",
      value: traces.toLocaleString(),
    },
    {
      icon:  <DollarSign size={13} />,
      label: "Total LLM Cost",
      value: `$${totalCost.toFixed(4)}`,
    },
    {
      icon:  <Clock size={13} />,
      label: "Avg Latency",
      value: `${(avgLatency * 1000).toFixed(0)}ms`,
    },
    {
      icon:  <Hash size={13} />,
      label: "Total Tokens",
      value: totalTokens.toLocaleString(),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[var(--border)] rounded-md overflow-hidden bg-[var(--bg-surface)]">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex items-start gap-2.5 px-3 py-2.5",
            i < items.length - 1 && "border-r border-[var(--border)]"
          )}
        >
          <div className="mt-0.5 text-[var(--accent)] opacity-70">{item.icon}</div>
          {loading
            ? <div className="space-y-1.5">
                <div className="h-5 w-16 bg-[var(--bg-elevated)] rounded animate-pulse" />
                <div className="h-3 w-24 bg-[var(--bg-elevated)] rounded animate-pulse" />
              </div>
            : <div>
                <p className="text-base font-semibold font-mono text-[var(--text-primary)] leading-none">
                  {item.value}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.label}</p>
              </div>
          }
        </div>
      ))}
    </div>
  );
};
```

---

## 8. Daily Cost Chart

```tsx
// src/pages/langfuse/DailyCostChart.tsx
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import type { LfDailyMetric } from "@/api/langfuse";

export const DailyCostChart = ({ data }: { data: LfDailyMetric[] }) => {
  const chartData = data
    .slice()
    .reverse()  // API returns newest first
    .map(d => ({
      date:        format(parseISO(d.date), "MMM d"),
      cost:        +d.totalCost.toFixed(5),
      traces:      d.countTraces,
      tokens:      d.usage.reduce((s, u) => s + u.totalUsage, 0),
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#7C3AED" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `$${v.toFixed(3)}`}
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
            name === "cost" ? [`$${v.toFixed(5)}`, "Cost"] : [v.toLocaleString(), name]
          }
        />
        <Area
          type="monotone"
          dataKey="cost"
          stroke="#7C3AED"
          strokeWidth={1.5}
          fill="url(#costGrad)"
          dot={false}
          activeDot={{ r: 3, fill: "#7C3AED" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
```

---

## 9. Model Usage Pie

```tsx
// src/pages/langfuse/ModelUsagePie.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { LfDailyMetric } from "@/api/langfuse";

const MODEL_COLORS = [
  "#7C3AED", "#3B82F6", "#22C55E", "#F59E0B",
  "#EF4444", "#EC4899", "#14B8A6", "#F97316",
];

export const ModelUsagePie = ({ data }: { data: LfDailyMetric[] }) => {
  // Aggregate by model across all days
  const modelTotals: Record<string, { tokens: number; cost: number }> = {};
  data.forEach(day => {
    day.usage.forEach(u => {
      if (!modelTotals[u.model]) modelTotals[u.model] = { tokens: 0, cost: 0 };
      modelTotals[u.model].tokens += u.totalUsage;
      modelTotals[u.model].cost   += u.totalCost;
    });
  });

  const pieData = Object.entries(modelTotals)
    .sort(([, a], [, b]) => b.tokens - a.tokens)
    .map(([model, d], i) => ({
      name:   model || "unknown",
      value:  d.tokens,
      cost:   d.cost,
      color:  MODEL_COLORS[i % MODEL_COLORS.length],
    }));

  if (!pieData.length) return (
    <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
      No model data
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="42%"
          innerRadius="50%"
          outerRadius="70%"
          paddingAngle={2}
          dataKey="value"
        >
          {pieData.map(entry => (
            <Cell key={entry.name} fill={entry.color} fillOpacity={0.9} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 11,
          }}
          formatter={(v: number, _: string, props: any) => [
            `${v.toLocaleString()} tokens · $${props.payload.cost.toFixed(5)}`,
            props.payload.name,
          ]}
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

---

## 10. Traces Table

```tsx
// src/pages/langfuse/TracesTable.tsx
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { CopyField } from "@/components/shared/CopyField";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { LfTrace, LfObservation } from "@/api/langfuse";
import { ObservationTree } from "./ObservationTree";

interface Props {
  traces:   LfTrace[];
  loading:  boolean;
  page:     number;
  total:    number;
  onPage:   (p: number) => void;
}

export const TracesTable = ({ traces, loading, page, total, onPage }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 bg-[var(--bg-elevated)] rounded animate-pulse" />
      ))}
    </div>
  );

  if (!traces.length) return (
    <div className="h-24 flex items-center justify-center text-xs text-[var(--text-muted)]">
      No traces found for this key
    </div>
  );

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[32px_1fr_160px_90px_90px_80px_80px] gap-0 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-t-md">
        {["", "Trace Name / ID", "Session (reqc-id)", "Timestamp", "Latency", "Tokens", "Cost"].map((h, i) => (
          <div key={i} className={cn(
            "px-3 h-9 flex items-center text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]",
            i > 0 && "border-l border-[var(--border)]"
          )}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="border-x border-b border-[var(--border)] rounded-b-md overflow-hidden">
        {traces.map((trace, idx) => {
          const isExpanded = expandedId === trace.id;
          const hasSession = !!trace.sessionId;

          return (
            <div key={trace.id}>
              {/* Row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : trace.id)}
                className={cn(
                  "grid grid-cols-[32px_1fr_160px_90px_90px_80px_80px] cursor-pointer transition-colors",
                  "border-t border-[var(--border)]/50 hover:bg-[var(--bg-hover)]",
                  isExpanded && "bg-[var(--bg-hover)]",
                  idx === 0 && "border-t-0"
                )}
              >
                {/* Expand toggle */}
                <div className="flex items-center justify-center h-10 text-[var(--text-muted)]">
                  {isExpanded
                    ? <ChevronDown size={13} />
                    : <ChevronRight size={13} />
                  }
                </div>

                {/* Name + ID */}
                <div className="px-3 h-10 flex flex-col justify-center border-l border-[var(--border)]/50">
                  <span className="text-xs text-[var(--text-primary)] font-medium truncate">
                    {trace.name ?? "—"}
                  </span>
                  <CopyField value={trace.id} showLast={12}
                    className="text-[10px] text-[var(--text-muted)]" />
                </div>

                {/* Session ID (= reqc-id) */}
                <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
                  {hasSession
                    ? <CopyField value={trace.sessionId!} showLast={8}
                        className="text-[10px] font-mono text-[var(--text-secondary)]" />
                    : <span className="text-[10px] text-[var(--text-muted)]">—</span>
                  }
                </div>

                {/* Timestamp */}
                <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {format(parseISO(trace.timestamp), "MMM d HH:mm:ss")}
                  </span>
                </div>

                {/* Latency */}
                <div className="px-3 h-10 flex items-center justify-end border-l border-[var(--border)]/50">
                  <span className={cn(
                    "text-xs font-mono",
                    trace.latency == null            ? "text-[var(--text-muted)]" :
                    trace.latency < 1                ? "text-[var(--success)]"    :
                    trace.latency < 3                ? "text-[var(--warning)]"    :
                                                       "text-[var(--error)]"
                  )}>
                    {trace.latency != null ? `${(trace.latency * 1000).toFixed(0)}ms` : "—"}
                  </span>
                </div>

                {/* Tokens */}
                <div className="px-3 h-10 flex items-center justify-end border-l border-[var(--border)]/50">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {trace.usage?.total?.toLocaleString() ?? "—"}
                  </span>
                </div>

                {/* Cost */}
                <div className="px-3 h-10 flex items-center justify-end border-l border-[var(--border)]/50">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {trace.totalCost != null ? `$${trace.totalCost.toFixed(5)}` : "—"}
                  </span>
                </div>
              </div>

              {/* Expanded: observation tree */}
              {isExpanded && (
                <div className="border-t border-[var(--accent)]/20 bg-[var(--bg-elevated)]/50">
                  <ObservationTree traceId={trace.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-[var(--text-muted)]">
          {total.toLocaleString()} total traces
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(page - 1)}
            disabled={page === 1}
            className="px-2 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)]"
          >
            ← Prev
          </button>
          <span className="px-2 text-xs text-[var(--text-muted)]">Page {page}</span>
          <button
            onClick={() => onPage(page + 1)}
            disabled={traces.length < 20}
            className="px-2 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)]"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## 11. Observation Tree (inline inside expanded trace row)

This is the most important component. When admin expands a trace, they see every LLM call, tool invocation, and span inside it — formatted exactly like Langfuse's own trace detail, but inline.

**`src/pages/langfuse/ObservationTree.tsx`**

```tsx
import { useQuery } from "@tanstack/react-query";
import { langfuseApi, type LfObservation } from "@/api/langfuse";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronRight, ChevronDown, Zap, Box, Circle } from "lucide-react";
import { format, parseISO } from "date-fns";

// Icon per observation type
const OBS_ICON = {
  GENERATION: <Zap size={11} className="text-[var(--accent)]" />,
  SPAN:       <Box size={11} className="text-[var(--info)]" />,
  EVENT:      <Circle size={11} className="text-[var(--warning)]" />,
};

const OBS_BADGE_COLOR = {
  GENERATION: "text-[var(--accent)]   border-[var(--accent)]/30   bg-[var(--accent)]/5",
  SPAN:       "text-[var(--info)]     border-[var(--info)]/30     bg-[var(--info)]/5",
  EVENT:      "text-[var(--warning)]  border-[var(--warning)]/30  bg-[var(--warning)]/5",
};

const ObservationRow = ({ obs }: { obs: LfObservation }) => {
  const [expanded, setExpanded] = useState(false);

  const hasIO = obs.input != null || obs.output != null;
  const latencyMs = obs.endTime && obs.startTime
    ? new Date(obs.endTime).getTime() - new Date(obs.startTime).getTime()
    : null;

  return (
    <div>
      <div
        className={cn(
          "flex items-start gap-2 px-4 py-2 cursor-pointer hover:bg-[var(--bg-hover)] transition-colors",
          expanded && "bg-[var(--bg-hover)]"
        )}
        onClick={() => hasIO && setExpanded(p => !p)}
      >
        {/* Toggle icon */}
        <div className="mt-0.5 w-4 shrink-0 text-[var(--text-muted)]">
          {hasIO
            ? expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />
            : <span className="w-4 inline-block" />
          }
        </div>

        {/* Type badge + name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {OBS_ICON[obs.type]}
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded border",
            OBS_BADGE_COLOR[obs.type]
          )}>
            {obs.type}
          </span>
          <span className="text-xs text-[var(--text-primary)] truncate font-medium">
            {obs.name ?? "unnamed"}
          </span>
          {obs.model && (
            <span className="text-[10px] text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] border border-[var(--border)] shrink-0">
              {obs.model}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 shrink-0 text-[10px] font-mono">
          {latencyMs != null && (
            <span className={cn(
              latencyMs < 1000 ? "text-[var(--success)]" :
              latencyMs < 3000 ? "text-[var(--warning)]" :
                                  "text-[var(--error)]"
            )}>
              {latencyMs}ms
            </span>
          )}
          {obs.usage?.total != null && (
            <span className="text-[var(--text-muted)]">{obs.usage.total.toLocaleString()} tok</span>
          )}
          {obs.usage?.totalCost != null && (
            <span className="text-[var(--text-secondary)]">${obs.usage.totalCost.toFixed(5)}</span>
          )}
        </div>
      </div>

      {/* Expanded: input / output */}
      {expanded && (
        <div className="px-10 pb-3 space-y-2 border-t border-[var(--border)]/30">
          {obs.input != null && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1 mt-2">
                Input
              </p>
              <IoBlock value={obs.input} />
            </div>
          )}
          {obs.output != null && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                Output
              </p>
              <IoBlock value={obs.output} />
            </div>
          )}
          {obs.modelParameters && Object.keys(obs.modelParameters).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">
                Model Parameters
              </p>
              <pre className="text-[10px] font-mono bg-[var(--bg-elevated)] border border-[var(--border)] rounded p-2 overflow-auto max-h-24 text-[var(--text-secondary)]">
                {JSON.stringify(obs.modelParameters, null, 2)}
              </pre>
            </div>
          )}
          {obs.statusMessage && (
            <p className="text-[10px] text-[var(--error)] mt-1">{obs.statusMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};

// Smart I/O renderer — handles string, array (messages), and object
const IoBlock = ({ value }: { value: unknown }) => {
  // OpenAI-style messages array
  if (Array.isArray(value) && value[0]?.role) {
    return (
      <div className="space-y-1">
        {(value as { role: string; content: string }[]).map((msg, i) => (
          <div key={i} className={cn(
            "rounded px-2.5 py-1.5 text-[10px]",
            msg.role === "assistant"
              ? "bg-[var(--accent)]/10 border border-[var(--accent)]/20"
              : "bg-[var(--bg-elevated)] border border-[var(--border)]"
          )}>
            <span className={cn(
              "font-semibold uppercase text-[9px] tracking-wide mr-2",
              msg.role === "assistant"
                ? "text-[var(--accent)]"
                : "text-[var(--text-muted)]"
            )}>
              {msg.role}
            </span>
            <span className="text-[var(--text-secondary)] whitespace-pre-wrap">{msg.content}</span>
          </div>
        ))}
      </div>
    );
  }

  // Plain string
  if (typeof value === "string") {
    return (
      <pre className="text-[10px] font-mono bg-[var(--bg-elevated)] border border-[var(--border)] rounded p-2 overflow-auto max-h-32 text-[var(--text-secondary)] whitespace-pre-wrap">
        {value}
      </pre>
    );
  }

  // Object/other
  return (
    <pre className="text-[10px] font-mono bg-[var(--bg-elevated)] border border-[var(--border)] rounded p-2 overflow-auto max-h-32 text-[var(--text-secondary)] whitespace-pre-wrap">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};

// Main component — fetches observations when mounted
export const ObservationTree = ({ traceId }: { traceId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["lf-obs", traceId],
    queryFn:  () => langfuseApi.observationsByTrace(traceId),
    staleTime: 10 * 60_000,
  });

  if (isLoading) return (
    <div className="px-4 py-3 space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-8 bg-[var(--bg-elevated)] rounded animate-pulse" />
      ))}
    </div>
  );

  const observations = data?.data ?? [];

  if (!observations.length) return (
    <div className="px-4 py-3 text-[11px] text-[var(--text-muted)]">
      No observations in this trace
    </div>
  );

  return (
    <div className="divide-y divide-[var(--border)]/30">
      {/* Summary header */}
      <div className="flex items-center gap-4 px-4 py-2 text-[10px] text-[var(--text-muted)]">
        <span>{observations.length} observations</span>
        <span>·</span>
        <span>{observations.filter(o => o.type === "GENERATION").length} LLM calls</span>
        <span>·</span>
        <span>
          Total: {observations.reduce((s, o) => s + (o.usage?.total ?? 0), 0).toLocaleString()} tokens
        </span>
        <span>·</span>
        <span>
          ${observations.reduce((s, o) => s + (o.usage?.totalCost ?? 0), 0).toFixed(5)} cost
        </span>
      </div>
      {/* Observation rows */}
      {observations.map(obs => <ObservationRow key={obs.id} obs={obs} />)}
    </div>
  );
};
```

---

## 12. Session Lookup Panel (reqc-id → full trace)

When admin sees a `reqc-id` in system logs and wants to see what LLM calls it triggered:

```tsx
// src/pages/langfuse/SessionLookup.tsx
// A standalone search panel — also accessible from the Logs page

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { langfuseApi } from "@/api/langfuse";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { ObservationTree } from "./ObservationTree";

export const SessionLookup = () => {
  const [reqcId, setReqcId]     = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["lf-session", submitted],
    queryFn:  () => langfuseApi.tracesBySession(submitted),
    enabled:  !!submitted,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="border border-[var(--border)] rounded-md bg-[var(--bg-surface)] p-3">
      <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">
        Lookup by Request ID (reqc-id)
      </p>
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="reqc-071b..."
          value={reqcId}
          onChange={e => setReqcId(e.target.value)}
          onKeyDown={e => e.key === "Enter" && setSubmitted(reqcId.trim())}
          className="h-8 text-sm font-mono"
        />
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs shrink-0"
          onClick={() => setSubmitted(reqcId.trim())}
          disabled={!reqcId.trim() || isLoading}
        >
          <Search size={12} />
          {isLoading ? "Searching..." : "Find Traces"}
        </Button>
      </div>

      {isError && (
        <p className="text-xs text-[var(--error)]">Failed to fetch — check Langfuse config in Settings</p>
      )}

      {data && data.data.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">No traces found for session "{submitted}"</p>
      )}

      {data && data.data.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--text-muted)]">
            {data.data.length} trace(s) in session
          </p>
          {data.data.map(trace => (
            <div key={trace.id} className="border border-[var(--border)] rounded overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                <div>
                  <span className="text-xs font-medium text-[var(--text-primary)]">{trace.name ?? "trace"}</span>
                  <span className="text-[10px] text-[var(--text-muted)] ml-2 font-mono">{trace.id.slice(0, 16)}...</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  {trace.latency != null && (
                    <span className="text-[var(--text-secondary)]">{(trace.latency * 1000).toFixed(0)}ms</span>
                  )}
                  {trace.totalCost != null && (
                    <span className="text-[var(--text-secondary)]">${trace.totalCost.toFixed(5)}</span>
                  )}
                </div>
              </div>
              <ObservationTree traceId={trace.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 13. Logs Page Integration

Add a "Lookup in Langfuse" button directly in the log row actions, and inline session lookup at the top of the Logs page.

```tsx
// In Logs.tsx — add to log detail drawer footer:
{selectedLog?.api_key && (
  <Button
    variant="ghost"
    size="sm"
    className="text-xs gap-1.5 text-[var(--accent)]"
    onClick={() => navigate(`/langfuse?key=${encodeURIComponent(selectedLog.api_key!)}`)}
  >
    <FlaskConical size={12} />
    View key traces in Langfuse →
  </Button>
)}

// If the log has a reqc-id in its URL or metadata, show session lookup:
{selectedLog?.url?.match(/reqc-[a-z0-9]+/) && (
  <Button
    variant="ghost"
    size="sm"
    className="text-xs gap-1.5 text-[var(--accent)]"
    onClick={() => {
      const reqcId = selectedLog.url.match(/reqc-[a-z0-9]+/)?.[0];
      navigate(`/langfuse?session=${reqcId}`);
    }}
  >
    <FlaskConical size={12} />
    Find LLM calls for this request →
  </Button>
)}
```

---

## 14. Full Page Assembly

**`src/pages/Langfuse.tsx`**

```tsx
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { langfuseApi } from "@/api/langfuse";
import { getLangfuseSettings } from "@/lib/storage";
import { PageHeader }       from "@/components/shared/PageHeader";
import { ChartCard }        from "./analytics/ChartCard";
import { KeySelector }      from "./langfuse/KeySelector";
import { LangfuseKpis }     from "./langfuse/LangfuseKpis";
import { DailyCostChart }   from "./langfuse/DailyCostChart";
import { ModelUsagePie }    from "./langfuse/ModelUsagePie";
import { TracesTable }      from "./langfuse/TracesTable";
import { SessionLookup }    from "./langfuse/SessionLookup";

export default function LangfusePage() {
  const [params, setParams] = useSearchParams();
  const initialKey     = params.get("key") ?? "";
  const initialSession = params.get("session") ?? "";

  const [selectedKey, setSelectedKey] = useState(initialKey);
  const [tracePage, setTracePage]     = useState(1);

  const { host } = getLangfuseSettings();
  const langfuseConfigured = !!getLangfuseSettings().publicKey;

  // ── Queries ────────────────────────────────────────────────────────────
  const { data: tracesData, isLoading: tracesLoading } = useQuery({
    queryKey: ["lf-traces", selectedKey, tracePage],
    queryFn:  () => langfuseApi.tracesByKey(selectedKey, tracePage),
    enabled:  !!selectedKey && langfuseConfigured,
    staleTime: 2 * 60_000,
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ["lf-daily", selectedKey],
    queryFn:  () => langfuseApi.dailyMetrics(selectedKey, 30),
    enabled:  !!selectedKey && langfuseConfigured,
    staleTime: 10 * 60_000,
  });

  // ── Computed KPIs ──────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const traces   = tracesData?.data ?? [];
    const daily    = dailyData?.data  ?? [];
    const total    = tracesData?.meta.totalItems ?? 0;
    const avgLat   = traces.length
      ? traces.reduce((s, t) => s + (t.latency ?? 0), 0) / traces.filter(t => t.latency).length
      : 0;
    const totalCost    = daily.reduce((s, d) => s + d.totalCost, 0);
    const totalTokens  = daily.reduce((s, d) =>
      s + d.usage.reduce((u, m) => u + m.totalUsage, 0), 0);

    return { traces: total, totalCost, avgLatency: avgLat, totalTokens };
  }, [tracesData, dailyData]);

  // ── No config state ────────────────────────────────────────────────────
  if (!langfuseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">Langfuse not configured</p>
        <p className="text-xs text-[var(--text-muted)] max-w-xs">
          Add your Langfuse public key, secret key, and host in Settings to view LLM traces.
        </p>
        <a href="/settings" className="text-xs text-[var(--accent)] hover:underline">
          Open Settings →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <PageHeader
        title="LLM Traces"
        subtitle="Langfuse observability — API key traces, costs, and token usage"
        actions={
          <div className="flex items-center gap-2">
            <KeySelector
              value={selectedKey}
              onChange={key => { setSelectedKey(key); setTracePage(1); }}
            />
            {selectedKey && (
              <a
                href={`${host}/users/${encodeURIComponent(selectedKey)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                title="Open in Langfuse"
              >
                <ExternalLink size={12} />
                Open in Langfuse
              </a>
            )}
          </div>
        }
      />

      {/* Session lookup — always visible */}
      <SessionLookup />

      {/* KPIs — only when key selected */}
      {selectedKey && (
        <LangfuseKpis
          {...kpis}
          loading={tracesLoading || dailyLoading}
        />
      )}

      {/* Charts — only when key selected and daily data exists */}
      {selectedKey && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <ChartCard
            title="Daily LLM Cost"
            subtitle="USD cost per day over last 30 days"
            className="lg:col-span-2"
            height={200}
            loading={dailyLoading}
            empty={!dailyData?.data.length}
          >
            <DailyCostChart data={dailyData?.data ?? []} />
          </ChartCard>

          <ChartCard
            title="Model Usage"
            subtitle="Token share by model"
            height={200}
            loading={dailyLoading}
            empty={!dailyData?.data.some(d => d.usage.length)}
          >
            <ModelUsagePie data={dailyData?.data ?? []} />
          </ChartCard>
        </div>
      )}

      {/* Traces table */}
      {selectedKey && (
        <div className="border border-[var(--border)] rounded-md bg-[var(--bg-surface)] p-3">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-3">
            Traces
            {tracesData?.meta.totalItems != null && (
              <span className="ml-2 font-normal text-[var(--text-muted)]">
                ({tracesData.meta.totalItems.toLocaleString()} total)
              </span>
            )}
          </p>
          <TracesTable
            traces={tracesData?.data ?? []}
            loading={tracesLoading}
            page={tracePage}
            total={tracesData?.meta.totalItems ?? 0}
            onPage={setTracePage}
          />
        </div>
      )}

      {/* Empty state when no key selected */}
      {!selectedKey && (
        <div className="h-48 flex flex-col items-center justify-center gap-2 text-center border border-[var(--border)] rounded-md bg-[var(--bg-surface)]">
          <p className="text-sm text-[var(--text-muted)]">Select an API key to view its LLM traces</p>
          <p className="text-xs text-[var(--text-muted)]">
            Or use the session lookup above to find traces by reqc-id
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## 15. File Delivery Order

```
1.  src/lib/storage.ts              ← add LANGFUSE_* keys + getLangfuseAuthHeader()
2.  src/api/langfuse.ts             ← full API client + types
3.  src/pages/langfuse/KeySelector.tsx
4.  src/pages/langfuse/LangfuseKpis.tsx
5.  src/pages/langfuse/DailyCostChart.tsx
6.  src/pages/langfuse/ModelUsagePie.tsx
7.  src/pages/langfuse/ObservationTree.tsx     ← most complex, build last in this group
8.  src/pages/langfuse/TracesTable.tsx         ← depends on ObservationTree
9.  src/pages/langfuse/SessionLookup.tsx
10. src/pages/Langfuse.tsx
11. src/pages/Settings.tsx                     ← add LangfuseSettingsSection
12. src/components/layout/Sidebar.tsx          ← add "LLM Traces" nav entry
13. src/main.tsx                               ← add /langfuse route
14. src/pages/ApiKeys.tsx                      ← add FlaskConical button to rows
15. src/pages/Logs.tsx                         ← add "View in Langfuse" to log drawer
```

---

## 16. Acceptance Checklist

**Settings**
- [ ] Langfuse host, public key, secret key save to localStorage
- [ ] "Test Connection" hits `/api/public/traces?limit=1` and shows ✓ / ✗
- [ ] All Langfuse fields masked by default with reveal toggle

**API Keys page**
- [ ] Every row has a `FlaskConical` icon button
- [ ] Clicking it navigates to `/langfuse?key=<full_key>`
- [ ] `···` menu also has "View LLM Traces" option

**Langfuse page — unconfigured**
- [ ] Shows "Langfuse not configured" message with link to Settings
- [ ] Does not make any API calls when unconfigured

**Langfuse page — configured, no key selected**
- [ ] Session Lookup panel visible and functional
- [ ] Empty state shown for the traces area
- [ ] Key selector dropdown populates from `/admin/keys`

**Langfuse page — key selected**
- [ ] URL updates to `/langfuse?key=sk-xxx` when key changes
- [ ] 4 KPI cards show correct values from traces + daily data
- [ ] Daily cost chart renders 30 days of data (newest → oldest left to right after sort)
- [ ] Model usage pie slices match models used by that key
- [ ] Traces table shows 20 rows per page with pagination
- [ ] Each trace row shows: name, trace ID (copyable), session/reqc-id (copyable), timestamp, latency (color coded), tokens, cost

**Trace expansion**
- [ ] Clicking a trace row expands inline (no navigation)
- [ ] Observation tree fetches `/api/public/observations?traceId=xxx` on first expand
- [ ] Each observation shows type badge (GENERATION / SPAN / EVENT)
- [ ] Model name shown for GENERATION observations
- [ ] Latency color: green <1s, amber 1-3s, red >3s
- [ ] Clicking an observation expands input/output
- [ ] OpenAI message format (role/content arrays) renders as styled message bubbles
- [ ] Model parameters shown in collapsible block
- [ ] Summary line shows observation count, LLM call count, total tokens, total cost

**Session lookup**
- [ ] Entering a reqc-id and pressing Enter or clicking Find fetches traces for that session
- [ ] Each trace in the result shows its full observation tree
- [ ] "No traces found" shown gracefully when session doesn't exist
- [ ] Error state shown when Langfuse is unreachable

**Logs page integration**
- [ ] "View key traces" button appears in log drawer when `api_key` is present
- [ ] Button navigates to `/langfuse?key=<api_key>`

**External link**
- [ ] "Open in Langfuse" link opens `<host>/users/<api_key>` in a new tab
- [ ] Link only shown when a key is selected

---

*End of Langfuse Integration Implementation Plan*  
*Qwint Talk Admin Panel*
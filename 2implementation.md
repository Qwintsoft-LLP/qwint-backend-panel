Context: What's Built, What's Broken, What's Missing

From the current screenshots, the panel is alive and working — dark mode looks correct, the layout is right, sidebar navigation is clean. Three problems exist that this document fixes:

Bug 1 — Light mode has no contrast. Cards, table rows, sidebar, and the page background are all the same white. Borders don't show. Nothing is visually separated. The token values exist in the CSS but the actual rendered contrast between --bg-base → --bg-surface → --bg-elevated is too subtle. Fix is precise — not a redesign.

Bug 2 — Stats are incomplete. Dashboard shows 4 metrics. The panel has enough data to show 8+ meaningful operational stats including time-based credit burn rate, budget utilization %, zero-balance users, and error rate. These should be visible at a glance.

Gap 1 — No charts. There is no time-series or distribution view anywhere. For a super admin panel this is a major blind spot — you can't see trends, spikes, or patterns.

Gap 2 — User list is basic. The wallets page shows balances but lacks sorting, column filtering, inline search, and status segmentation. It needs to behave like a real user management screen.

Gap 3 — Missing data density everywhere. API Keys page, Orders page, and Logs page all lack advanced filtering, column visibility toggles, bulk selection, and export.


Fix 1 — Light Mode Contrast System (Critical)

Problem

Current light mode tokens are too close together:

--bg-base:     #FAFAFA   ← page canvas
--bg-surface:  #FFFFFF   ← cards
--bg-elevated: #F4F4F5   ← inputs, table headers
--border:      #E4E4E7   ← nearly invisible on white

On a monitor with average gamma, #FAFAFA vs #FFFFFF is invisible. #E4E4E7 on #FFFFFF is a 1.05:1 contrast ratio — below perceptible threshold.

Fix: Replace Light Mode Tokens

In src/index.css, replace the :root block entirely:

css:root {
  /* ── Light Mode — reworked for visible contrast ── */
  --bg-base:        #F0F0F3;   /* Page canvas — perceptibly gray */
  --bg-surface:     #FFFFFF;   /* Cards, panels — pure white stands out */
  --bg-elevated:    #F5F5F8;   /* Table headers, input fills */
  --bg-hover:       #EBEBEF;   /* Row hover — clearly darker than surface */
  --border:         #D1D1DB;   /* Visible border — 3:1 contrast on white */
  --border-focus:   #A1A1B5;   /* Focus ring — strong enough to notice */
  --text-primary:   #0A0A0F;
  --text-secondary: #52525E;
  --text-muted:     #8C8C9A;

  --accent:         #7C3AED;
  --accent-hover:   #6D28D9;
  --success:        #15803D;   /* Darker green for light bg legibility */
  --warning:        #B45309;   /* Darker amber */
  --error:          #B91C1C;   /* Darker red */
  --info:           #1D4ED8;   /* Darker blue */

  /* Semantic surface roles */
  --sidebar-bg:     #FFFFFF;
  --sidebar-border: #D1D1DB;
  --topbar-bg:      #FFFFFF;
  --card-bg:        #FFFFFF;
  --card-border:    #D1D1DB;
  --table-header:   #F5F5F8;
  --input-bg:       #FFFFFF;
  --input-border:   #C4C4D0;
}

Additional CSS rules to enforce contrast

Add these under the :root block:

css/* Light mode — explicit shadows to lift cards off the page */
:root .card,
:root [data-card],
:root .admin-card {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--card-border);
}

/* Table header must never blend into rows */
:root thead tr {
  background-color: var(--table-header) !important;
  border-bottom: 2px solid var(--border) !important;
}

/* Sidebar needs a right border in light mode */
:root aside {
  border-right: 1px solid var(--sidebar-border);
  background-color: var(--sidebar-bg);
}

/* Stat cards in light mode get a subtle left accent */
:root .stat-card {
  border-left: 3px solid var(--accent);
}

Dark mode — keep exactly as-is. No changes.

css.dark {
  /* Unchanged from Phase 2 */
  --bg-base:        #0A0A0A;
  --bg-surface:     #111111;
  --bg-elevated:    #1A1A1A;
  --bg-hover:       #222222;
  --border:         #2A2A2A;
  --border-focus:   #3A3A3A;
  --text-primary:   #F5F5F5;
  --text-secondary: #888888;
  --text-muted:     #555555;
  --sidebar-bg:     #111111;
  --sidebar-border: #2A2A2A;
  --topbar-bg:      #111111;
  --card-bg:        #111111;
  --card-border:    #2A2A2A;
  --table-header:   #1A1A1A;
  --input-bg:       #1A1A1A;
  --input-border:   #3A3A3A;
  --success:        #22C55E;
  --warning:        #F59E0B;
  --error:          #EF4444;
  --info:           #3B82F6;
}

DataCard component update

The DataCard component needs a class addition so the shadow rule above applies:

tsx// In src/components/shared/DataCard.tsx
// Add "admin-card stat-card" to the className:
<div className={cn(
  "admin-card stat-card border border-[var(--card-border)] rounded-md p-3 bg-[var(--card-bg)]",
  className
)}>

Verification checklist for light mode fix


 Page canvas (--bg-base) is visibly different from card background (--bg-surface)
 Table header row is visibly different from table body rows
 All card borders are visible — no card bleeds into the page background
 Sidebar has a visible right border separating it from content area
 Input fields have a visible border in unfocused state
 All badge text (success/error/warning) readable on light backgrounds
 Status badges readable without relying on color alone (they have text labels)



Fix 2 — Dashboard Stats: Full Metric Suite

Current state

4 metric cards: Active API Keys, Budget Allocated, System Errors, Total Credits Used.

Target state

8 metric cards across 2 rows of 4, plus a secondary stats bar for derived metrics.

Row 1 — Primary Metrics (existing, enhanced)

CardValueSourceEnhancementActive API Keyskeys.filter(k => k.is_active).length/admin/keysAdd sub-label: "X inactive"Budget AllocatedSum of all budgetsameSub-label: "X keys have < $10 left"System Errorslogs.filter(l => l.level === "error").length/logs/latestSub-label: "of 50 recent" + error rate %Credits Used (Recent)Sum credits_deducted from logssameSub-label: in last ~N minutes

Row 2 — Operational Metrics (new)

CardValueComputationIconBudget Utilization(totalUsed / totalAllocated * 100).toFixed(1)%Keys dataGauge iconKeys Never Usedkeys.filter(k => !k.last_used).lengthKeys dataClock iconAvg Response Timeavg(logs.filter(l => l.duration_ms).map(l => l.duration_ms)) msLogs dataTimer iconError Rate(errorCount / totalLogs * 100).toFixed(1)%Logs dataAlertTriangle

Secondary Stats Bar (text-only, below cards)

A single compact row between the cards and the activity feed:

Total Keys: 42  ·  Total Budget: $12,480  ·  Avg Key Budget: $297  ·  Most Active App: qwint_caption  ·  Keys Used Today: 8

Implementation:

tsx// src/pages/Dashboard.tsx — add below the metric card grid
const StatsBar = ({ keys, logs }: { keys: ApiKey[]; logs: LogEntry[] }) => {
  const totalBudget  = keys.reduce((s, k) => s + k.budget, 0);
  const avgBudget    = keys.length ? (totalBudget / keys.length).toFixed(0) : 0;
  const appCounts    = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.app_name] = (acc[l.app_name] ?? 0) + 1;
    return acc;
  }, {});
  const topApp       = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const usedToday    = keys.filter(k => {
    if (!k.last_used) return false;
    return new Date(k.last_used).toDateString() === new Date().toDateString();
  }).length;

  const stats = [
    { label: "Total Keys",     value: keys.length },
    { label: "Total Budget",   value: `$${totalBudget.toLocaleString()}` },
    { label: "Avg Key Budget", value: `$${avgBudget}` },
    { label: "Top App",        value: topApp },
    { label: "Keys Used Today",value: usedToday },
  ];

  return (
    <div className="flex items-center gap-4 px-3 py-2 rounded border border-[var(--border)] bg-[var(--bg-elevated)] text-[11px] text-[var(--text-muted)] mb-4 flex-wrap">
      {stats.map((s, i) => (
        <span key={s.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[var(--border)] select-none">·</span>}
          <span className="text-[var(--text-secondary)]">{s.label}:</span>
          <span className="font-medium text-[var(--text-primary)]">{String(s.value)}</span>
        </span>
      ))}
    </div>
  );
};


Addition 1 — Charts (New Section on Dashboard)

Add a charts section below the activity feed. Three charts total, each in its own card.

Chart Stack

[Credit Burn Over Time — Line]    [Log Level Distribution — Bar]    [Budget Health — Horizontal Bar]
       60% width                           20% width                          20% width

Use Recharts (already in the stack per Phase 2). No new deps.

Chart 1: Credit Burn Over Time (Line Chart)

Data: group logs by hour using created_at, sum credits_deducted per bucket.

tsx// src/components/charts/CreditBurnChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props { logs: LogEntry[] }

export const CreditBurnChart = ({ logs }: Props) => {
  const data = useMemo(() => {
    // Group by hour bucket
    const buckets: Record<string, number> = {};
    logs.forEach(l => {
      if (!l.credits_deducted) return;
      const hour = format(new Date(l.created_at), "HH:00");
      buckets[hour] = (buckets[hour] ?? 0) + l.credits_deducted;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, credits]) => ({ hour, credits: +credits.toFixed(2) }));
  }, [logs]);

  if (data.length < 2) return (
    <div className="h-48 flex items-center justify-center text-xs text-[var(--text-muted)]">
      Not enough data for trend
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 11,
            color: "var(--text-primary)",
          }}
          formatter={(v: number) => [`${v} cr`, "Credits"]}
        />
        <Line
          type="monotone"
          dataKey="credits"
          stroke="var(--accent)"  /* Use CSS var — works in both modes */
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: "var(--accent)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

Chart 2: Log Level Distribution (Bar Chart)

Data: count of info, warn, error from logs array.

tsx// src/components/charts/LogLevelChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const LogLevelChart = ({ logs }: { logs: LogEntry[] }) => {
  const data = useMemo(() => {
    const counts = logs.reduce<Record<string, number>>((acc, l) => {
      acc[l.level] = (acc[l.level] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { level: "INFO",  count: counts["info"]  ?? 0, color: "#3B82F6" },
      { level: "WARN",  count: counts["warn"]  ?? 0, color: "#F59E0B" },
      { level: "ERROR", count: counts["error"] ?? 0, color: "#EF4444" },
    ];
  }, [logs]);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="level" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 11,
            color: "var(--text-primary)",
          }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {data.map((entry) => <Cell key={entry.level} fill={entry.color} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

Chart 3: Budget Health (Horizontal Bar per key)

Show top 10 keys by budget, each as a horizontal bar showing remaining / budget fill.

tsx// src/components/charts/BudgetHealthChart.tsx
export const BudgetHealthChart = ({ keys }: { keys: ApiKey[] }) => {
  const top10 = [...keys]
    .filter(k => k.is_active)
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 10);

  return (
    <div className="space-y-2">
      {top10.map(k => {
        const pct = k.budget > 0 ? (k.remaining_budget / k.budget) * 100 : 0;
        const color = pct >= 70 ? "var(--success)" : pct >= 30 ? "var(--warning)" : "var(--error)";
        return (
          <div key={k.key} className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-secondary)] truncate max-w-[100px]">{k.username}</span>
              <span className="font-mono text-[var(--text-muted)]">${k.remaining_budget.toFixed(0)}</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

Dashboard layout with charts

tsx// In Dashboard.tsx, after the activity feed section:
<div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
  {/* Credit burn — takes 3 of 5 columns */}
  <div className="lg:col-span-3 border border-[var(--card-border)] rounded-md bg-[var(--card-bg)] admin-card p-3">
    <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Credit Burn (by hour)</p>
    <CreditBurnChart logs={logs} />
  </div>

  {/* Log level dist — 1 of 5 */}
  <div className="lg:col-span-1 border border-[var(--card-border)] rounded-md bg-[var(--card-bg)] admin-card p-3">
    <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Log Levels</p>
    <LogLevelChart logs={logs} />
  </div>

  {/* Budget health — 1 of 5 */}
  <div className="lg:col-span-1 border border-[var(--card-border)] rounded-md bg-[var(--card-bg)] admin-card p-3">
    <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">Budget Health</p>
    <BudgetHealthChart keys={apiKeys} />
  </div>
</div>


Addition 2 — API Keys Page: Full Data Controls

Current state

Table with basic columns. No sorting, no column visibility, no bulk actions, no export.

Add: Column Visibility Toggle

tsx// src/components/shared/ColumnToggle.tsx
import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface ColumnToggleProps {
  columns: { key: string; label: string; visible: boolean }[];
  onChange: (key: string, visible: boolean) => void;
}

export const ColumnToggle = ({ columns, onChange }: ColumnToggleProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
        <Settings2 size={12} />
        Columns
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-44 p-2 bg-[var(--bg-elevated)] border-[var(--border)]">
      {columns.map(col => (
        <label key={col.key} className="flex items-center gap-2 px-1 py-1 cursor-pointer hover:bg-[var(--bg-hover)] rounded text-xs">
          <input
            type="checkbox"
            checked={col.visible}
            onChange={e => onChange(col.key, e.target.checked)}
            className="accent-[var(--accent)] w-3 h-3"
          />
          {col.label}
        </label>
      ))}
    </PopoverContent>
  </Popover>
);

Add: Client-side Sorting to AdminTable

Update AdminTable to support sortable columns:

tsx// Add to AdminTable props:
interface AdminTableProps<T> {
  // ...existing
  defaultSort?:  { key: string; dir: "asc" | "desc" };
  sortFn?:       (key: string, dir: "asc" | "desc") => (a: T, b: T) => number;
}

// Inside AdminTable component:
const [sort, setSort] = useState(defaultSort ?? null);

const sorted = useMemo(() => {
  if (!sort || !sortFn) return data;
  return [...data].sort(sortFn(sort.key, sort.dir));
}, [data, sort, sortFn]);

// In header cell, for sortable columns:
<th
  key={col.key}
  onClick={() => col.sortable && setSort(p =>
    p?.key === col.key
      ? { key: col.key, dir: p.dir === "asc" ? "desc" : "asc" }
      : { key: col.key, dir: "asc" }
  )}
  className={cn(
    "...",
    col.sortable && "cursor-pointer select-none hover:text-[var(--text-primary)]"
  )}
>
  <span className="flex items-center gap-1">
    {col.header}
    {col.sortable && sort?.key === col.key && (
      <span className="text-[var(--accent)]">{sort.dir === "asc" ? "↑" : "↓"}</span>
    )}
    {col.sortable && sort?.key !== col.key && (
      <span className="text-[var(--text-muted)] opacity-40">↕</span>
    )}
  </span>
</th>

Sortable columns for API Keys

ts// In ApiKeys.tsx, define sortFn:
const sortFn = (key: string, dir: "asc" | "desc") => (a: ApiKey, b: ApiKey) => {
  const mul = dir === "asc" ? 1 : -1;
  switch (key) {
    case "username":         return mul * a.username.localeCompare(b.username);
    case "remaining_budget": return mul * (a.remaining_budget - b.remaining_budget);
    case "budget":           return mul * (a.budget - b.budget);
    case "created_at":       return mul * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case "last_used": {
      const aT = a.last_used ? new Date(a.last_used).getTime() : 0;
      const bT = b.last_used ? new Date(b.last_used).getTime() : 0;
      return mul * (aT - bT);
    }
    default: return 0;
  }
};

Add: Bulk Select + Bulk Export

Add a checkbox column as the first column:

tsx// Bulk selection state
const [selected, setSelected] = useState<Set<string>>(new Set());
const toggleAll = () =>
  setSelected(s => s.size === filteredKeys.length
    ? new Set()
    : new Set(filteredKeys.map(k => k.key))
  );
const toggle = (key: string) =>
  setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

// Bulk action bar — appears when selection > 0
{selected.size > 0 && (
  <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-sm">
    <span className="text-xs text-[var(--text-secondary)]">{selected.size} selected</span>
    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={exportSelected}>
      Export CSV
    </Button>
    <Button size="sm" variant="ghost" className="h-7 text-xs text-[var(--text-muted)]"
      onClick={() => setSelected(new Set())}>
      Clear
    </Button>
  </div>
)}

CSV Export function

ts// src/lib/export.ts
export const exportToCsv = (filename: string, rows: Record<string, unknown>[]) => {
  const headers = Object.keys(rows[0] ?? {});
  const csv     = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

Add: Advanced Filter Bar for API Keys

Replace the single search input with a proper filter row:

tsx<div className="flex items-center gap-2 mb-3 flex-wrap">
  <Input
    placeholder="Search username, key, or note..."
    value={search}
    onChange={e => setSearch(e.target.value)}
    className="h-8 text-sm w-64"
  />

  <Select value={statusFilter} onValueChange={setStatusFilter}>
    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Status</SelectItem>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="inactive">Inactive</SelectItem>
    </SelectContent>
  </Select>

  <Select value={budgetFilter} onValueChange={setBudgetFilter}>
    <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Budget Health" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Budgets</SelectItem>
      <SelectItem value="healthy">Healthy (≥70%)</SelectItem>
      <SelectItem value="warning">Low (30–70%)</SelectItem>
      <SelectItem value="critical">Critical (&lt;30%)</SelectItem>
      <SelectItem value="empty">Exhausted ($0)</SelectItem>
    </SelectContent>
  </Select>

  <Select value={usageFilter} onValueChange={setUsageFilter}>
    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Usage" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Usage</SelectItem>
      <SelectItem value="used">Ever Used</SelectItem>
      <SelectItem value="unused">Never Used</SelectItem>
      <SelectItem value="recent">Used Today</SelectItem>
    </SelectContent>
  </Select>

  {/* Active filter count badge */}
  {activeFilterCount > 0 && (
    <button onClick={clearFilters} className="text-xs text-[var(--accent)] hover:underline">
      Clear ({activeFilterCount})
    </button>
  )}

  <div className="flex-1" />
  <ColumnToggle columns={visibleCols} onChange={toggleCol} />
  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={exportAll}>
    Export CSV
  </Button>
</div>

Client-side filter pipeline

tsconst filteredKeys = useMemo(() => {
  return keys
    .filter(k => {
      if (!search) return true;
      return k.username.toLowerCase().includes(search.toLowerCase())
          || k.key.toLowerCase().includes(search.toLowerCase())
          || (k.note ?? "").toLowerCase().includes(search.toLowerCase());
    })
    .filter(k => statusFilter === "all"  || (statusFilter === "active" ? k.is_active : !k.is_active))
    .filter(k => {
      if (budgetFilter === "all") return true;
      const pct = k.budget > 0 ? (k.remaining_budget / k.budget) * 100 : 0;
      if (budgetFilter === "healthy")  return pct >= 70;
      if (budgetFilter === "warning")  return pct >= 30 && pct < 70;
      if (budgetFilter === "critical") return pct > 0 && pct < 30;
      if (budgetFilter === "empty")    return k.remaining_budget <= 0;
      return true;
    })
    .filter(k => {
      if (usageFilter === "all")    return true;
      if (usageFilter === "used")   return !!k.last_used;
      if (usageFilter === "unused") return !k.last_used;
      if (usageFilter === "recent") {
        if (!k.last_used) return false;
        return new Date(k.last_used).toDateString() === new Date().toDateString();
      }
      return true;
    });
}, [keys, search, statusFilter, budgetFilter, usageFilter]);


Addition 3 — Wallets: Full User Management

Current state

Table shows user ID, balance, status. No search, no sort, no segmentation.

Target state

A full user management screen with segmentation tabs, rich sorting, inline top-up, and a user detail drawer.

Segmentation Tabs (above table)

tsx// Replace simple page with tabbed view
const SEGMENTS = [
  { key: "all",      label: "All Users" },
  { key: "active",   label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "rich",     label: "High Balance (>500 cr)" },
  { key: "empty",    label: "Zero Balance" },
];

<div className="flex items-center gap-0 border-b border-[var(--border)] mb-4">
  {SEGMENTS.map(s => (
    <button
      key={s.key}
      onClick={() => setSegment(s.key)}
      className={cn(
        "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
        segment === s.key
          ? "border-[var(--accent)] text-[var(--text-primary)]"
          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      )}
    >
      {s.label}
      <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">
        ({segmentCount(s.key, balances)})
      </span>
    </button>
  ))}
</div>

Enhanced Wallet Table Columns

tsconst walletColumns: Column<WalletBalance>[] = [
  {
    key: "user",
    header: "User",
    sortable: true,
    cell: r => (
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">
          {r.name ?? <span className="text-[var(--text-muted)] font-normal">Unnamed</span>}
        </p>
        <CopyField value={r.user_id} showLast={8}
          className="text-[10px] text-[var(--text-muted)]" />
      </div>
    )
  },
  {
    key: "mobile",
    header: "Mobile",
    cell: r => <CopyField value={r.mobile} masked showLast={4} />
  },
  {
    key: "balance_credits",
    header: "Credits",
    align: "right",
    sortable: true,
    cell: r => (
      <span className={cn(
        "font-mono text-sm font-semibold",
        r.balance_credits === 0    ? "text-[var(--text-muted)]"  :
        r.balance_credits > 500    ? "text-[var(--success)]"     :
        r.balance_credits < 50     ? "text-[var(--warning)]"     :
        "text-[var(--text-primary)]"
      )}>
        {r.balance_credits.toLocaleString()}
      </span>
    )
  },
  {
    key: "status",
    header: "Status",
    cell: r => statusBadge(r.is_active ? "active" : "inactive")
  },
  {
    key: "joined",
    header: "Joined",
    sortable: true,
    cell: r => (
      <span className="text-xs text-[var(--text-secondary)]" title={fullTime(r.created_at)}>
        {relativeTime(r.created_at)}
      </span>
    )
  },
  {
    key: "actions",
    header: "",
    width: "80px",
    cell: r => (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs px-2"
          onClick={e => { e.stopPropagation(); openTopup(r.user_id); }}
        >
          Top-up
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={e => { e.stopPropagation(); navigate(`/wallets/${r.user_id}`); }}
        >
          <ChevronRight size={13} />
        </Button>
      </div>
    )
  },
];

Sort options for Wallets

tsconst walletSortFn = (key: string, dir: "asc" | "desc") => (a: WalletBalance, b: WalletBalance) => {
  const mul = dir === "asc" ? 1 : -1;
  switch (key) {
    case "user":             return mul * (a.name ?? "").localeCompare(b.name ?? "");
    case "balance_credits":  return mul * (a.balance_credits - b.balance_credits);
    case "joined":           return mul * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    default: return 0;
  }
};

User Summary Stats Bar (wallets page)

tsxconst totalCredits    = balances.reduce((s, b) => s + b.balance_credits, 0);
const zeroBalance     = balances.filter(b => b.balance_credits === 0).length;
const highBalance     = balances.filter(b => b.balance_credits > 500).length;
const inactiveUsers   = balances.filter(b => !b.is_active).length;

// Render as StatsBar (same component from Dashboard):
<StatsBar stats={[
  { label: "Total Users",     value: balances.length },
  { label: "Total Credits",   value: totalCredits.toLocaleString() },
  { label: "Zero Balance",    value: zeroBalance },
  { label: "High Balance",    value: highBalance },
  { label: "Inactive",        value: inactiveUsers },
]} />

User Detail Drawer (alternative to full page navigate)

Add a right-side drawer that opens on row click instead of navigating away. Full page (/wallets/:userId) still exists for deep-link, but the drawer gives faster access:

tsx// State
const [drawerUser, setDrawerUser] = useState<WalletBalance | null>(null);

// Transaction query — only fires when drawer opens
const { data: txns = [], isLoading: txLoading } = useQuery({
  queryKey:  ["txns", drawerUser?.user_id],
  queryFn:   () => walletApi.transactions(drawerUser!.user_id),
  enabled:   !!drawerUser,
});

// Drawer content
<Sheet open={!!drawerUser} onOpenChange={v => !v && setDrawerUser(null)}>
  <SheetContent side="right" className="w-[480px] bg-[var(--bg-surface)] p-0 flex flex-col">
    {/* Header */}
    <div className="px-4 py-3 border-b border-[var(--border)] flex items-start justify-between">
      <div>
        <p className="text-sm font-semibold">{drawerUser?.name ?? "Unnamed User"}</p>
        <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{drawerUser?.user_id}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold font-mono">{drawerUser?.balance_credits.toLocaleString()}</p>
        <p className="text-[10px] text-[var(--text-muted)]">credits</p>
      </div>
    </div>
    {/* Quick top-up inline */}
    <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
      <Input
        type="number"
        placeholder="Credits to add..."
        value={quickTopupAmount}
        onChange={e => setQuickTopupAmount(e.target.value)}
        className="h-8 text-sm w-40"
      />
      <Input
        placeholder="Reason..."
        value={quickTopupNote}
        onChange={e => setQuickTopupNote(e.target.value)}
        className="h-8 text-sm flex-1"
      />
      <Button size="sm" className="h-8 text-xs" onClick={handleQuickTopup} disabled={topupLoading}>
        Add
      </Button>
    </div>
    {/* Transaction history */}
    <div className="flex-1 overflow-y-auto">
      {txLoading
        ? <div className="p-4 space-y-2">{Array.from({length: 6}).map((_, i) => (
            <div key={i} className="h-10 bg-[var(--bg-elevated)] rounded animate-pulse" />
          ))}</div>
        : txns.length === 0
        ? <p className="text-center text-xs text-[var(--text-muted)] py-8">No transactions</p>
        : txns.map(tx => (
            <div key={tx.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-[var(--border)]/50 hover:bg-[var(--bg-hover)]">
              <div className="mt-0.5">{statusBadge(tx.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-primary)] truncate">{tx.description ?? "—"}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{fullTime(tx.created_at)}</p>
              </div>
              <span className={cn(
                "text-sm font-mono font-medium shrink-0",
                tx.type === "CREDIT" ? "text-[var(--success)]" : "text-[var(--error)]"
              )}>
                {tx.type === "CREDIT" ? "+" : "−"}{Math.abs(tx.amount).toLocaleString()}
              </span>
            </div>
          ))
      }
    </div>
    {/* Footer link */}
    <div className="px-4 py-2.5 border-t border-[var(--border)]">
      <Button variant="ghost" size="sm" className="text-xs w-full"
        onClick={() => navigate(`/wallets/${drawerUser?.user_id}`)}>
        View Full History →
      </Button>
    </div>
  </SheetContent>
</Sheet>


Addition 4 — Logs Page: Advanced Controls

Current state (from screenshot)

Search, date range, level filter, app filter, column toggle, rows per page, pagination. This is already good. Add the following:

Add: URL-synced filters

Persist active filters in URL search params so refreshing or sharing a URL preserves the filter state:

ts// src/hooks/useLogFilters.ts
import { useSearchParams } from "react-router-dom";

export const useLogFilters = () => {
  const [params, setParams] = useSearchParams();

  const search     = params.get("q")     ?? "";
  const level      = params.get("level") ?? "all";
  const app        = params.get("app")   ?? "all";
  const apiKey     = params.get("key")   ?? "";
  const userId     = params.get("uid")   ?? "";
  const dateFrom   = params.get("from")  ?? "";
  const dateTo     = params.get("to")    ?? "";

  const set = (key: string, value: string) =>
    setParams(p => { const n = new URLSearchParams(p); value ? n.set(key, value) : n.delete(key); return n; });

  return {
    search, level, app, apiKey, userId, dateFrom, dateTo,
    setSearch:   (v: string) => set("q",     v),
    setLevel:    (v: string) => set("level", v),
    setApp:      (v: string) => set("app",   v),
    setApiKey:   (v: string) => set("key",   v),
    setUserId:   (v: string) => set("uid",   v),
    setDateFrom: (v: string) => set("from",  v),
    setDateTo:   (v: string) => set("to",    v),
    clearAll:    () => setParams({}),
    activeCount: [search, level !== "all" && level, app !== "all" && app, apiKey, userId, dateFrom, dateTo]
                   .filter(Boolean).length,
  };
};

Add: Log stats bar (above the table)

tsx// Computed from current filtered results
const logStats = useMemo(() => ({
  total:    filtered.length,
  errors:   filtered.filter(l => l.level === "error").length,
  avgMs:    filtered.filter(l => l.duration_ms).reduce((s, l, _, a) => s + (l.duration_ms ?? 0) / a.length, 0),
  credits:  filtered.reduce((s, l) => s + (l.credits_deducted ?? 0), 0),
}), [filtered]);

<div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3">
  <span>Showing <strong className="text-[var(--text-primary)]">{logStats.total}</strong> entries</span>
  <span>·</span>
  <span><strong className="text-[var(--error)]">{logStats.errors}</strong> errors</span>
  <span>·</span>
  <span>Avg <strong className="text-[var(--text-primary)]">{logStats.avgMs.toFixed(0)}ms</strong></span>
  <span>·</span>
  <span><strong className="text-[var(--text-primary)]">{logStats.credits.toFixed(2)}</strong> cr deducted</span>
</div>

Add: Log Export

tsx<Button
  size="sm"
  variant="outline"
  className="h-8 text-xs gap-1"
  onClick={() => exportToCsv(`logs-${Date.now()}.csv`, filtered.map(l => ({
    time:     l.created_at,
    level:    l.level,
    method:   l.method,
    url:      l.url,
    status:   l.status_code,
    duration: l.duration_ms,
    credits:  l.credits_deducted,
    api_key:  l.api_key,
    user_id:  l.user_id,
    message:  l.message,
  })))}
>
  <Download size={12} />
  Export
</Button>

Add: Error-only quick filter button

tsx<Button
  size="sm"
  variant={level === "error" ? "default" : "outline"}
  className={cn("h-8 text-xs gap-1", level === "error" && "bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/30")}
  onClick={() => setLevel(level === "error" ? "all" : "error")}
>
  <AlertTriangle size={12} />
  Errors only
</Button>


Addition 5 — Orders Page: Enhanced Columns & Filters

Current state (from screenshot)

Shows ORDER ID / REF, APP / TYPE, CUSTOMER, PRODUCT / INFO, AMOUNT / CREDITS, STATUS, PAYMENT ID, CREATED. This is solid. Add:

Missing columns to add

ts// Add to orders table after STATUS:
{
  key: "credits_minutes",
  header: "Credits",
  align: "right",
  cell: r => <span className="font-mono text-xs">{r.credits_minutes} cr</span>
},

Add: Order stats bar

tsxconst orderStats = useMemo(() => ({
  total:       orders.length,
  paid:        orders.filter(o => o.status === "PAID").length,
  pending:     orders.filter(o => o.status === "PENDING").length,
  failed:      orders.filter(o => o.status === "FAILED").length,
  totalRevenue: orders.filter(o => o.status === "PAID")
                       .reduce((s, o) => s + o.amount, 0),
}), [orders]);

<div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3 flex-wrap">
  <span><strong className="text-[var(--text-primary)]">{orderStats.total}</strong> orders</span>
  <span>·</span>
  <span><strong className="text-[var(--success)]">{orderStats.paid}</strong> paid</span>
  <span>·</span>
  <span><strong className="text-[var(--warning)]">{orderStats.pending}</strong> pending</span>
  <span>·</span>
  <span><strong className="text-[var(--error)]">{orderStats.failed}</strong> failed</span>
  <span>·</span>
  <span>Revenue: <strong className="text-[var(--text-primary)]">${orderStats.totalRevenue.toLocaleString()}</strong></span>
</div>

Add: Status filter tabs on Orders

Same tab pattern as Wallets, filtered by PAID, PENDING, FAILED, All.

Add: Orders Export

tsx<Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={exportOrders}>
  <Download size={12} />
  Export
</Button>


Addition 6 — Global UX Improvements

Keyboard Shortcut: Global Command Palette

Add a ⌘K / Ctrl+K command palette for fast navigation. Opens a Command dialog from shadcn.

tsx// src/components/shared/CommandPalette.tsx
import { Command, CommandDialog, CommandInput, CommandList, CommandItem, CommandGroup } from "@/components/ui/command";
import { useNavigate } from "react-router-dom";

export const CommandPalette = () => {
  const [open, setOpen] = useState(false);
  const navigate        = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(p => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const go = (path: string) => { navigate(path); setOpen(false); };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Go to... (type page name or action)" className="text-sm" />
      <CommandList>
        <CommandGroup heading="Navigation">
          {[
            { label: "Dashboard",           path: "/dashboard" },
            { label: "API Keys",            path: "/api-keys" },
            { label: "Wallets & Users",     path: "/wallets" },
            { label: "Products & Pricing",  path: "/payments/products" },
            { label: "Orders",              path: "/payments/orders" },
            { label: "System Logs",         path: "/logs" },
            { label: "Settings",            path: "/settings" },
          ].map(item => (
            <CommandItem key={item.path} onSelect={() => go(item.path)} className="text-sm">
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => { go("/api-keys"); }}>Generate New API Key</CommandItem>
          <CommandItem onSelect={() => { go("/wallets"); }}>Manual Wallet Top-up</CommandItem>
          <CommandItem onSelect={() => { go("/logs"); }}>View System Logs</CommandItem>
          <CommandItem onSelect={() => { go("/settings"); }}>Open Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

Add <CommandPalette /> to AppShell.tsx. Add ⌘K hint to topbar:

tsx// In Topbar, after the breadcrumb:
<button
  onClick={() => setCommandOpen(true)}
  className="hidden md:flex items-center gap-1.5 px-2 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--border-focus)] hover:text-[var(--text-secondary)] transition-colors"
>
  <span>Quick jump</span>
  <kbd className="text-[10px] bg-[var(--bg-elevated)] px-1 rounded">⌘K</kbd>
</button>

Empty state improvements

Replace generic "No data" with contextual messages per page:

tsx// API Keys empty state
<div className="h-32 flex flex-col items-center justify-center gap-2 text-center">
  <Key size={20} className="text-[var(--text-muted)]" />
  <p className="text-sm text-[var(--text-muted)]">No API keys found</p>
  <p className="text-xs text-[var(--text-muted)]">
    {search || statusFilter !== "all" ? "Try adjusting your filters" : "Generate your first key to get started"}
  </p>
</div>

Pattern for all pages: icon + primary message + context-aware secondary message.

Table row density toggle

Add a compact/normal toggle to tables with many rows:

tsx// In page header actions area
const [dense, setDense] = useState(false);
<Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDense(p => !p)} title="Toggle density">
  <AlignJustify size={13} />
</Button>

// Pass to AdminTable as prop:
rowHeight={dense ? "h-8" : "h-10"}


Verification Checklist — Phase 3 Complete

Light Mode


 Page canvas visibly darker than card surface
 Table header visibly different from table rows
 All card borders visible without straining
 Sidebar has a visible right border
 Input fields have visible unfocused borders
 All badge text readable at normal viewing distance
 Dark mode completely unchanged (regression test)


Dashboard


 8 metric cards in 2 rows of 4
 Secondary stats bar renders all 5 computed values
 Credit burn line chart renders when logs have data
 Log level bar chart shows INFO/WARN/ERROR counts
 Budget health bars render for top 10 active keys
 Live refresh toggle works with 60s interval


API Keys


 All 5 filter dropdowns work independently and in combination
 Column visibility toggle shows/hides columns correctly
 Table sortable by: username, budget, remaining, created, last used
 Bulk select: checkbox selects rows; select-all works
 CSV export downloads with correct filename and data
 Filter count badge appears; "Clear (N)" resets all filters


Wallets


 5 segment tabs filter the table correctly
 Count in each tab reflects current data
 Stats bar computes total credits, zero balance, inactive counts
 User detail drawer opens on row click
 Quick top-up inside drawer works and updates balance
 Transaction list in drawer shows correct type colors


Logs


 URL search params sync with filter state (persist on refresh)
 Log stats bar computes from filtered results
 Errors-only quick filter button works
 CSV export includes all visible filtered rows


Orders


 Stats bar shows total, paid, pending, failed, total revenue
 Status tabs filter correctly
 Export downloads CSV with all fields


Global


 ⌘K / Ctrl+K opens command palette
 All navigation items in palette work
 Action items in palette navigate to correct page
 Empty states have contextual messages and icons
 Density toggle changes row height (compact: 32px, normal: 40px)



End of Phase 3 Enhancement Prompt

Qwint Talk Super Admin Panel
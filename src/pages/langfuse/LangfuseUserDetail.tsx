import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Layers, DollarSign, ExternalLink, ChevronRight, ChevronDown, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLangfuseSettings, getStorage, STORAGE_KEYS } from "@/lib/storage";
import {
  useLangfuseUser,
  useUserTraces,
  useUserSessions,
  useUserScores,
} from "@/hooks/useLangfuseUser";
import { useLangfuseUserCharts } from "@/hooks/useLangfuseUserCharts";
import { ObservationTree } from "./ObservationTree";
import CopyField from "@/components/shared/CopyField";
import { format, parseISO } from "date-fns";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

// ── Tabs ───────────────────────────────────────────────────────────────────
type Tab = "traces" | "sessions" | "scores";

// ── Format helpers ─────────────────────────────────────────────────────────
function fmtTokens(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return String(n);
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return format(parseISO(iso), "MMM d, yyyy h:mm a");
}

// ── Stat pill ──────────────────────────────────────────────────────────────
function StatPill({
  icon, label, value, loading,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; loading: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <div className="p-2 rounded bg-[var(--accent)]/10 text-[var(--accent)] shrink-0">
        {icon}
      </div>
      {loading ? (
        <div className="space-y-1">
          <div className="h-4 w-12 bg-[var(--bg-elevated)] rounded animate-pulse" />
          <div className="h-3 w-20 bg-[var(--bg-elevated)] rounded animate-pulse" />
        </div>
      ) : (
        <div>
          <p className="text-xl font-bold font-mono text-[var(--text-primary)] leading-none">{value}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">{label}</p>
        </div>
      )}
    </div>
  );
}

// ── Analytics Dashboard ─────────────────────────────────────────────────────
function UserAnalytics({ userId }: { userId: string }) {
  const { data: chartData, isLoading } = useLangfuseUserCharts(userId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-[250px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg animate-pulse" />
        <div className="h-[250px] bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!chartData || chartData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Token Usage Chart */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Token Usage (30 Days)
        </h3>
        <div className="h-[200px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} tickFormatter={(v) => fmtTokens(v)} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                labelStyle={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}
              />
              <Legend verticalAlign="top" height={30} iconType="circle" wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
              <Area type="monotone" dataKey="inputTokens" name="Input" stackId="1" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorInput)" />
              <Area type="monotone" dataKey="outputTokens" name="Output" stackId="1" stroke="#ec4899" strokeWidth={2} fill="url(#colorOutput)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Chart */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg p-4">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Cost (30 Days)
        </h3>
        <div className="h-[200px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                labelStyle={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}
                formatter={(val: any) => [`$${Number(val).toFixed(4)}`, "Cost"]}
              />
              <Bar dataKey="cost" name="Daily Cost" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Traces tab content ─────────────────────────────────────────────────────
function TracesTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useUserTraces(userId, page, 20);

  const traces = data?.data ?? [];
  const total = data?.meta?.totalItems ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-1.5 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-[var(--bg-elevated)] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!traces.length) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-[var(--text-muted)]">
        No traces found for this user
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[32px_1fr_140px_100px_80px_80px_80px] bg-[var(--bg-elevated)] border-b border-[var(--border)]">
        {["", "Trace Name / ID", "Session ID", "Timestamp", "Latency", "Tokens", "Cost"].map((h, i) => (
          <div key={i} className={cn(
            "px-3 h-8 flex items-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]",
            i > 0 && "border-l border-[var(--border)]",
            i >= 4 && "justify-end",
          )}>
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--border)]/50">
        {traces.map((trace: any) => {
          const isExpanded = expandedId === trace.id;
          return (
            <div key={trace.id}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : trace.id)}
                className={cn(
                  "grid grid-cols-[32px_1fr_140px_100px_80px_80px_80px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]",
                  isExpanded && "bg-[var(--bg-hover)]",
                )}
              >
                <div className="flex items-center justify-center h-10 text-[var(--text-muted)]">
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </div>
                <div className="px-3 h-10 flex flex-col justify-center border-l border-[var(--border)]/50 min-w-0">
                  <span className="text-xs text-[var(--text-primary)] font-medium truncate">
                    {trace.name ?? "—"}
                  </span>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono truncate" onClick={e => e.stopPropagation()}>
                    <CopyField value={trace.id} />
                  </div>
                </div>
                <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50" onClick={e => e.stopPropagation()}>
                  {trace.sessionId
                    ? <div className="text-[10px] font-mono text-[var(--text-secondary)] truncate"><CopyField value={trace.sessionId} /></div>
                    : <span className="text-[10px] text-[var(--text-muted)]">—</span>
                  }
                </div>
                <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
                  <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                    {trace.timestamp ? format(parseISO(trace.timestamp), "MMM d HH:mm") : "—"}
                  </span>
                </div>
                <div className="px-3 h-10 flex items-center justify-end border-l border-[var(--border)]/50">
                  <span className={cn(
                    "text-xs font-mono",
                    trace.latency == null ? "text-[var(--text-muted)]" :
                    trace.latency < 1 ? "text-[var(--success)]" :
                    trace.latency < 3 ? "text-[var(--warning)]" : "text-[var(--error)]"
                  )}>
                    {trace.latency != null ? `${(trace.latency * 1000).toFixed(0)}ms` : "—"}
                  </span>
                </div>
                <div className="px-3 h-10 flex items-center justify-end border-l border-[var(--border)]/50">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {trace.usage?.total?.toLocaleString() ?? "—"}
                  </span>
                </div>
                <div className="px-3 h-10 flex items-center justify-end border-l border-[var(--border)]/50">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {trace.totalCost != null ? `$${trace.totalCost.toFixed(5)}` : "—"}
                  </span>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-[var(--accent)]/20 bg-[var(--bg-elevated)]/40">
                  <ObservationTree traceId={trace.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between p-3 border-t border-[var(--border)]">
        <span className="text-[11px] text-[var(--text-muted)]">{total.toLocaleString()} total traces</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors"
          >
            ← Prev
          </button>
          <span className="px-2 text-xs text-[var(--text-muted)]">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={traces.length < 20}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sessions tab content ───────────────────────────────────────────────────
function SessionsTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUserSessions(userId, page, 20);

  const sessions = data?.data ?? [];
  const total = data?.meta?.totalItems ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-1.5 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-[var(--bg-elevated)] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-[var(--text-muted)]">
        No sessions found for this user
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_140px_100px_120px] bg-[var(--bg-elevated)] border-b border-[var(--border)]">
        {["Session ID", "Traces", "Users", "Created At"].map((h, i) => (
          <div key={i} className={cn(
            "px-3 h-8 flex items-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]",
            i > 0 && "border-l border-[var(--border)]",
          )}>
            {h}
          </div>
        ))}
      </div>
      <div className="divide-y divide-[var(--border)]/50">
        {sessions.map((s: any) => (
          <div key={s.id} className="grid grid-cols-[1fr_140px_100px_120px] hover:bg-[var(--bg-hover)] transition-colors">
            <div className="px-3 h-10 flex items-center">
              <span className="text-xs font-mono text-[var(--text-primary)] truncate">{s.id}</span>
            </div>
            <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
              <span className="text-xs text-[var(--text-secondary)]">{s.countTraces ?? "—"}</span>
            </div>
            <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
              <span className="text-xs text-[var(--text-secondary)]">{s.userIds?.length ?? "—"}</span>
            </div>
            <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
              <span className="text-[10px] text-[var(--text-muted)]">
                {s.createdAt ? format(parseISO(s.createdAt), "MMM d HH:mm") : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between p-3 border-t border-[var(--border)]">
        <span className="text-[11px] text-[var(--text-muted)]">{total} total sessions</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors">
            ← Prev
          </button>
          <span className="px-2 text-xs text-[var(--text-muted)]">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={sessions.length < 20}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Scores tab content ─────────────────────────────────────────────────────
function ScoresTab({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUserScores(userId, page, 20);

  const scores = data?.data ?? [];
  const total = data?.meta?.totalItems ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-1.5 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-[var(--bg-elevated)] rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!scores.length) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-[var(--text-muted)]">
        No scores found for this user
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_100px_100px_120px_1fr] bg-[var(--bg-elevated)] border-b border-[var(--border)]">
        {["Name", "Value", "Source", "Trace ID", "Comment"].map((h, i) => (
          <div key={i} className={cn(
            "px-3 h-8 flex items-center text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]",
            i > 0 && "border-l border-[var(--border)]",
          )}>
            {h}
          </div>
        ))}
      </div>
      <div className="divide-y divide-[var(--border)]/50">
        {scores.map((s: any) => (
          <div key={s.id} className="grid grid-cols-[1fr_100px_100px_120px_1fr] hover:bg-[var(--bg-hover)] transition-colors">
            <div className="px-3 h-10 flex items-center">
              <span className="text-xs font-medium text-[var(--text-primary)]">{s.name}</span>
            </div>
            <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                {s.value != null ? s.value : "—"}
              </span>
            </div>
            <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
              <span className="text-[10px] text-[var(--text-muted)]">{s.source ?? "—"}</span>
            </div>
            <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
              <span className="text-[10px] font-mono text-[var(--text-muted)] truncate">
                {s.traceId ? `${s.traceId.slice(0, 12)}...` : "—"}
              </span>
            </div>
            <div className="px-3 h-10 flex items-center border-l border-[var(--border)]/50">
              <span className="text-xs text-[var(--text-muted)] truncate">{s.comment ?? "—"}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between p-3 border-t border-[var(--border)]">
        <span className="text-[11px] text-[var(--text-muted)]">{total} total scores</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors">
            ← Prev
          </button>
          <span className="px-2 text-xs text-[var(--text-muted)]">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={scores.length < 20}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors">
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function LangfuseUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("traces");
  const { host } = getLangfuseSettings();
  
  const apiBaseUrl = getStorage(STORAGE_KEYS.API_BASE_URL);
  let langfuseUserUrl = `${host}/users/${encodeURIComponent(userId ?? "")}`;
  if (apiBaseUrl.includes("v1.api.qwintsoft.com")) {
    langfuseUserUrl = `${host}/project/cmqhwbd35055had0cqx1f0ick/users/${encodeURIComponent(userId ?? "")}`;
  } else if (apiBaseUrl.includes("awgw38j7f03qa8i601ykib1r.3.shreylink.in")) {
    langfuseUserUrl = `${host}/project/cmqhwbmky04dwad0drag0bfwc/users/${encodeURIComponent(userId ?? "")}`;
  }

  const { data: user, isLoading: userLoading } = useLangfuseUser(userId ?? "");

  if (!userId) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-[var(--text-muted)]">
        No user ID specified
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          to="/langfuse?tab=users"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-[var(--text-primary)]">{userId}</span>
            <a
              href={langfuseUserUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              title="Open in Langfuse"
            >
              <ExternalLink size={14} />
            </a>
          </div>
          {user && (
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20">
                Active User
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                Last seen: {fmtDate(user.lastTrace)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-surface)] shadow-sm">
        <StatPill
          icon={<Layers size={18} />}
          label="Total Events"
          value={(user?.totalTraces ?? 0).toLocaleString()}
          loading={userLoading}
        />
        <StatPill
          icon={<ArrowRightLeft size={18} />}
          label="Total Tokens"
          value={user ? fmtTokens(user.totalTokens) : "0"}
          loading={userLoading}
        />
        <StatPill
          icon={<ArrowRightLeft size={18} />}
          label="Input Tokens"
          value={user ? fmtTokens(user.inputTokens) : "0"}
          loading={userLoading}
        />
        <StatPill
          icon={<ArrowRightLeft size={18} />}
          label="Output Tokens"
          value={user ? fmtTokens(user.outputTokens) : "0"}
          loading={userLoading}
        />
        <StatPill
          icon={<DollarSign size={18} />}
          label="Total Cost"
          value={user ? `$${user.totalCost.toFixed(4)}` : "$0"}
          loading={userLoading}
        />
      </div>

      {/* ── Analytics Charts ──────────────────────────────────────────── */}
      <UserAnalytics userId={userId} />

      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] overflow-hidden shadow-sm">
        <div className="flex border-b border-[var(--border)] bg-[var(--bg-elevated)]/50">
          {(["traces", "sessions", "scores"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 text-sm font-medium capitalize transition-all border-b-2 -mb-px",
                activeTab === tab
                  ? "border-[var(--accent)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border)]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab content ─────────────────────────────────────────────── */}
        <div className="bg-[var(--bg-surface)]">
          {activeTab === "traces" && <TracesTab userId={userId} />}
          {activeTab === "sessions" && <SessionsTab userId={userId} />}
          {activeTab === "scores" && <ScoresTab userId={userId} />}
        </div>
      </div>
    </div>
  );
}

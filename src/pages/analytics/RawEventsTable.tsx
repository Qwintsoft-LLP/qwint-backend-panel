import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdminTable from "@/components/shared/AdminTable";
import StatusBadge from "@/components/shared/StatusBadge";
import CopyField from "@/components/shared/CopyField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@/hooks/useLogs";

const shortTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

const statusColor = (code: number) => {
  if (code < 300) return "text-[var(--success)]";
  if (code < 400) return "text-[var(--info)]";
  if (code < 500) return "text-[var(--warning)]";
  return "text-[var(--error)]";
};

const levelBadge = (level: string) => {
  if (level === "info") return <StatusBadge variant="info">INFO</StatusBadge>;
  if (level === "warn") return <StatusBadge variant="warning">WARN</StatusBadge>;
  return <StatusBadge variant="error">ERROR</StatusBadge>;
};

const PAGE_SIZES = [25, 50, 100];

export const RawEventsTable = ({ logs }: { logs: LogEntry[] }) => {
  const [search,   setSearch]   = useState("");
  const [level,    setLevel]    = useState("all");
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => logs.filter(l => {
    const matchLevel  = level === "all" || l.level === level;
    const matchSearch = !search
      || (l.url && l.url.includes(search))
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
      cell: (r: LogEntry) => r.status
        ? <span className={cn("text-xs font-mono font-semibold", statusColor(r.status))}>
            {r.status}
          </span>
        : <span className="text-[var(--text-muted)]">—</span>,
    },
    {
      key: "duration", header: "Duration", width: "80px", align: "right" as const,
      cell: (r: LogEntry) => r.duration != null
        ? <span className="text-xs font-mono text-[var(--text-secondary)]">{r.duration}ms</span>
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
        ? <CopyField value={r.api_key} masked />
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
        isLoading={false}
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

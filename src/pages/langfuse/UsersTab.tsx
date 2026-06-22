import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users as UsersIcon } from "lucide-react";
import { useLangfuseUsersList, type LangfuseUser } from "@/hooks/useLangfuseUsersList";
import AdminTable, { type Column } from "@/components/shared/AdminTable";
import { format, parseISO } from "date-fns";

export function UsersTab() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useLangfuseUsersList(page, 20, searchQuery);

  const users = data?.data ?? [];
  const total = data?.meta?.totalItems ?? 0;

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setPage(1);
  };

  const fmtTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    return String(n);
  };

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    return format(parseISO(iso), "M/d/yyyy, h:mm:ss a");
  };

  const columns: Column<LangfuseUser>[] = [
    {
      key: "userId",
      header: "User ID",
      cell: (row) => (
        <button
          onClick={() => navigate(`/langfuse/users/${encodeURIComponent(row.userId)}`)}
          className="text-[var(--accent)] hover:underline font-medium text-xs font-mono text-left"
        >
          {row.userId}
        </button>
      ),
    },
    {
      key: "environment",
      header: "Environment",
      cell: () => (
        <span className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
          default
        </span>
      ),
    },
    {
      key: "firstTrace",
      header: "First Event",
      sortable: true,
      cell: (row) => <span className="text-[11px] text-[var(--text-secondary)]">{fmtDate(row.firstTrace)}</span>,
    },
    {
      key: "lastTrace",
      header: "Last Event",
      sortable: true,
      cell: (row) => <span className="text-[11px] text-[var(--text-secondary)]">{fmtDate(row.lastTrace)}</span>,
    },
    {
      key: "totalObservations",
      header: "Total Events",
      cell: (row) => <span className="text-[11px] text-[var(--text-secondary)]">{(row.totalObservations || row.totalTraces).toLocaleString()}</span>,
    },
    {
      key: "totalTokens",
      header: "Total Tokens",
      cell: (row) => <span className="text-[11px] text-[var(--text-secondary)]">{fmtTokens(row.totalTokens)}</span>,
    },
    {
      key: "totalCost",
      header: "Total Cost",
      cell: (row) => <span className="text-[11px] text-[var(--text-secondary)]">${(row.totalCost ?? 0).toFixed(2)}</span>,
    },
  ];

  return (
    <div className="space-y-4 border border-[var(--border)] rounded-lg bg-[var(--bg-surface)] p-4">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Users</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search (User ID)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md w-64 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <AdminTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        isEmpty={users.length === 0}
        sortFn={(key, dir) => (a, b) => {
          const valA = (a as any)[key] ?? "";
          const valB = (b as any)[key] ?? "";
          if (typeof valA === "string" && typeof valB === "string") {
            return dir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return 0;
        }}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        <span className="text-[11px] text-[var(--text-muted)]">
          {total} total users
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors"
          >
            ← Prev
          </button>
          <span className="px-2 text-xs text-[var(--text-muted)]">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={users.length < 20}
            className="px-2.5 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-secondary)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

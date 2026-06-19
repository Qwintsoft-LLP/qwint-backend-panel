import AdminTable from "@/components/shared/AdminTable";
import CopyField from "@/components/shared/CopyField";
import { relativeTime, fullTime } from "@/lib/utils";
import { FlaskConical } from "lucide-react";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";

interface Row {
  apiKey: string; username: string; requests: number;
  credits: number; lastUsed: string | null; remaining: number | null;
  totalTokens?: number;
}



export const PerKeyUsageTable = ({ data, loading }: { data: Row[]; loading: boolean }) => {
  const columns = [
    { key: "username", header: "Key", width: "180px",
      cell: (r: Row) => {
        const baseUrl = getStorage(STORAGE_KEYS.API_BASE_URL) || "http://localhost:3000";
        const isProd = baseUrl.includes("v1.api.qwintsoft.com");
        const projectId = isProd ? "cmqhwbd35055had0cqx1f0ick" : "cmqhwbmky04dwad0drag0bfwc";
        const langfuseUrl = `https://cloud.langfuse.com/project/${projectId}/users/${r.apiKey}`;

        return (
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium text-[var(--text-primary)]">{r.username}</p>
              <a 
                href={langfuseUrl} 
                target="_blank"
                rel="noopener noreferrer"
                title="View LLM Traces for this key"
                className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              >
                <FlaskConical className="w-3 h-3" />
              </a>
            </div>
            <div className="text-[10px] mt-0.5">
              <CopyField value={r.apiKey} truncate={12} />
            </div>
          </div>
        )
      }},
    { key: "requests", header: "Requests", align: "right" as const, width: "90px",
      cell: (r: Row) => <span className="font-mono text-xs">{r.requests.toLocaleString()}</span> },
    { key: "tokens", header: "Total Tokens", align: "right" as const, width: "100px",
      cell: (r: Row) => <span className="font-mono text-xs text-[var(--text-secondary)]">{r.totalTokens ? `${(r.totalTokens / 1000).toFixed(1)}k` : '0'}</span> },
    { key: "credits", header: "Credits Used", align: "right" as const, width: "110px",
      cell: (r: Row) => <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">{r.credits.toLocaleString()}</span> },
    { key: "avgPerReq", header: "Avg / Req", align: "right" as const, width: "90px",
      cell: (r: Row) => <span className="font-mono text-xs text-[var(--text-secondary)]">{r.requests > 0 ? (r.credits / r.requests).toFixed(2) : "0"}</span> },
    { key: "remaining", header: "Remaining Budget", align: "right" as const, width: "120px",
      cell: (r: Row) => r.remaining != null
        ? <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {Number(r.remaining).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        : <span className="text-[var(--text-muted)]">—</span> },
    { key: "lastUsed", header: "Last Activity", width: "120px",
      cell: (r: Row) => r.lastUsed
        ? <span className="text-xs text-[var(--text-secondary)]" title={fullTime(r.lastUsed)}>{relativeTime(r.lastUsed)}</span>
        : <span className="text-[var(--text-muted)]">—</span> },
  ];

  return (
    <div className="relative">
      <AdminTable
        columns={columns}
        data={data}
        isLoading={loading}
        isEmpty={!data || data.length === 0}
      />
      {!loading && (!data || data.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none text-sm text-[var(--text-muted)]">
          No key usage in this range
        </div>
      )}
    </div>
  );
};

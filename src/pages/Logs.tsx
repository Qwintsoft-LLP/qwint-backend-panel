import { useState, useEffect, useMemo, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { usePaginatedLogs, LogEntry } from "@/hooks/useLogs"
import AdminTable from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"
import SlideOver from "@/components/shared/SlideOver"
import { ExternalLink, RefreshCw, Settings, ChevronDown, Download, AlertTriangle, FlaskConical } from "lucide-react"
import { exportToCsv } from "@/lib/export"
import { useLogFilters } from "@/hooks/useLogFilters"
import { cn } from "@/lib/utils"

function JsonTooltip({ data }: { data: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const isObj = typeof data === 'object' && data !== null
  const displayStr = isObj ? JSON.stringify(data) : String(data)
  
  if (!data) return <span className="text-muted-foreground">—</span>

  return (
    <div 
      className="relative group inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
    >
      <div className="truncate max-w-[150px] text-muted-foreground cursor-pointer font-mono text-[10px]">
        {displayStr}
      </div>
      
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 z-[100] w-max max-w-[300px] sm:max-w-[500px]">
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md shadow-xl p-3">
            <pre className="text-[10px] font-mono text-[var(--text-primary)] whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar">
              {isObj ? JSON.stringify(data, null, 2) : String(data)}
            </pre>
          </div>
          <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-[var(--bg-surface)] border-b border-r border-[var(--border)] rotate-45"></div>
        </div>
      )}
    </div>
  )
}

const STANDARD_COLUMNS = [
  { id: "created_at", label: "Time" },
  { id: "app_name", label: "App" },
  { id: "level", label: "Level" },
  { id: "message", label: "Message" },
  { id: "request_id", label: "Request ID" },
  { id: "method", label: "Method" },
  { id: "url", label: "URL" },
  { id: "status", label: "Status" },
  { id: "duration", label: "Duration" },
  { id: "credits_deducted", label: "Credits" },
  { id: "user_id", label: "User ID" },
  { id: "api_key", label: "API Key" },
  { id: "response_data", label: "Response" },
]

export default function Logs() {
  const filters = useLogFilters()
  
  const [live, setLive] = useState(false)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  
  const [sortColumn, setSortColumn] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [itemsPerPage, setItemsPerPage] = useState<number | "All">(50)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: paginatedResponse, isLoading, refetch } = usePaginatedLogs({
    page: currentPage,
    limit: itemsPerPage === "All" ? 1000 : itemsPerPage,
    search: filters.search || undefined,
    level: filters.level !== "all" ? filters.level : undefined,
    method: filters.method !== "all" ? filters.method : undefined,
    app_name: filters.app !== "all" ? filters.app : undefined,
    api_key: filters.apiKey || undefined,
    user_id: filters.userId || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    sort_by: sortColumn,
    sort_order: sortDirection
  })

  const logs = paginatedResponse?.data || []
  const paginatedLogs = logs
  const totalPages = paginatedResponse?.meta.total_pages || 1

  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false)
  const colSelectorRef = useRef<HTMLDivElement>(null)

  // Extract unique metadata keys
  const metadataKeys = useMemo(() => {
    const keys = new Set<string>()
    logs?.forEach(log => {
      if (log.metadata && typeof log.metadata === 'object') {
        Object.keys(log.metadata).forEach(k => keys.add(k))
      }
    })
    return Array.from(keys)
  }, [logs])

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    return ["created_at", "app_name", "level", "message", "response_data", "request_id", "method", "status", "duration", "api_key"]
  })

  // Close column selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colSelectorRef.current && !colSelectorRef.current.contains(event.target as Node)) {
        setIsColumnSelectorOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters.search, filters.level, filters.app, filters.method, sortColumn, sortDirection, itemsPerPage, filters.dateFrom, filters.dateTo])

  const logStats = useMemo(() => {
    const stats = paginatedResponse?.meta?.stats;
    return {
      total:    paginatedResponse?.meta?.total_items || 0,
      errors:   stats?.total_errors || 0,
      avgMs:    stats?.avg_latency_ms || 0,
      credits:  stats?.total_credits_deducted || 0,
      totalTokens: stats?.total_tokens || 0,
      promptTokens: stats?.prompt_tokens || 0,
      thoughtsTokens: stats?.thoughts_tokens || 0,
      candidatesTokens: stats?.candidates_tokens || 0,
    };
  }, [paginatedResponse])

  const appNames = ["qwint_talk", "qwint_caption"];

  const SortableHeader = ({ column, label }: { column: string, label: string }) => (
    <button 
      className="flex items-center gap-1 hover:text-foreground transition-colors uppercase tracking-wider whitespace-nowrap"
      onClick={() => {
        if (sortColumn === column) {
          setSortDirection(prev => prev === "asc" ? "desc" : "asc")
        } else {
          setSortColumn(column)
          setSortDirection("desc")
        }
      }}
    >
      {label}
      {sortColumn === column && (
        <span className="text-accent">{sortDirection === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  )

  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev => 
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    )
  }

  const exportFiltered = () => {
    exportToCsv(`logs-${Date.now()}.csv`, paginatedLogs.map(l => ({
      time:     l.created_at,
      level:    l.level,
      method:   l.method,
      url:      l.url,
      status:   l.status,
      duration: l.duration,
      credits:  l.credits_deducted,
      api_key:  l.api_key,
      user_id:  l.user_id,
      message:  l.message,
    })))
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">System Logs</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer border border-border px-3 py-1.5 rounded-md hover:bg-muted transition-colors bg-card">
            <input 
              type="checkbox" 
              checked={live} 
              onChange={e => setLive(e.target.checked)}
              className="rounded bg-background border-border accent-[var(--accent)]"
            />
            Live (30s)
          </label>
          <button 
            onClick={() => refetch()}
            className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors bg-card"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
        <span>Showing <strong className="text-[var(--text-primary)]">{logStats.total}</strong> entries</span>
        <span>·</span>
        <span><strong className="text-[var(--error)]">{logStats.errors}</strong> errors</span>
        <span>·</span>
        <span>Avg <strong className="text-[var(--text-primary)]">{logStats.avgMs.toFixed(0)}ms</strong></span>
        <span>·</span>
        <span><strong className="text-[var(--text-primary)]">{logStats.credits.toFixed(2)}</strong> cr deducted</span>
        {(logStats.totalTokens > 0 || logStats.promptTokens > 0 || logStats.candidatesTokens > 0) && (
          <>
            <span>·</span>
            <div className="flex items-center gap-3 bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border)]">
              <span className="text-[10px] uppercase tracking-wider font-semibold">Tokens</span>
              {logStats.totalTokens > 0 && <span>Total: <strong className="text-[var(--text-primary)]">{logStats.totalTokens.toLocaleString()}</strong></span>}
              {logStats.promptTokens > 0 && <span>Prompt: <strong className="text-[var(--text-primary)]">{logStats.promptTokens.toLocaleString()}</strong></span>}
              {logStats.thoughtsTokens > 0 && <span>Thoughts: <strong className="text-[var(--text-primary)]">{logStats.thoughtsTokens.toLocaleString()}</strong></span>}
              {logStats.candidatesTokens > 0 && <span>Candidates: <strong className="text-[var(--text-primary)]">{logStats.candidatesTokens.toLocaleString()}</strong></span>}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-[var(--card-bg)] p-3 border border-[var(--card-border)] rounded-md shrink-0 relative z-20">
        <input 
          type="text" 
          placeholder="Search message, URL, key, user..."
          className="flex-1 min-w-[200px] h-8 px-3 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md"
          value={filters.search}
          onChange={e => filters.setSearch(e.target.value)}
        />
        
        <div className="flex items-center gap-2">
          <input 
            type="date"
            value={filters.dateFrom}
            onChange={(e) => filters.setDateFrom(e.target.value)}
            className="h-8 px-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-muted-foreground"
            title="Start Date"
          />
          <span className="text-muted-foreground text-sm">to</span>
          <input 
            type="date"
            value={filters.dateTo}
            onChange={(e) => filters.setDateTo(e.target.value)}
            className="h-8 px-2 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-muted-foreground"
            title="End Date"
          />
        </div>

        <button
          className={cn("flex items-center gap-1 h-8 px-3 text-xs border rounded-md transition-colors", 
            filters.level === "error" 
              ? "bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/30" 
              : "bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]")}
          onClick={() => filters.setLevel(filters.level === "error" ? "all" : "error")}
        >
          <AlertTriangle size={12} />
          Errors only
        </button>

        <select 
          className="h-8 px-3 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md w-32"
          value={filters.level}
          onChange={e => filters.setLevel(e.target.value)}
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>

        <select 
          className="h-8 px-3 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md w-32"
          value={filters.method}
          onChange={e => filters.setMethod(e.target.value)}
        >
          <option value="all">All Methods</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
        
        <select 
          className="h-8 px-3 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md w-36"
          value={filters.app}
          onChange={e => filters.setApp(e.target.value)}
        >
          <option value="all">All Apps</option>
          {appNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {filters.apiKey && (
          <div className="flex items-center gap-1 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 px-2 h-8 rounded text-xs">
            Key: {filters.apiKey.substring(0, 8)}...
            <button onClick={() => filters.setApiKey("")} className="ml-1 hover:text-[var(--text-primary)]">×</button>
          </div>
        )}
        
        {filters.userId && (
          <div className="flex items-center gap-1 bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 px-2 h-8 rounded text-xs">
            User: {filters.userId.substring(0, 8)}...
            <button onClick={() => filters.setUserId("")} className="ml-1 hover:text-[var(--text-primary)]">×</button>
          </div>
        )}

        {filters.activeCount > 0 && (
          <button onClick={filters.clearAll} className="text-xs text-[var(--accent)] hover:underline">
            Clear ({filters.activeCount})
          </button>
        )}

        <div className="relative" ref={colSelectorRef}>
          <button
            onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
            className="flex items-center gap-2 h-8 px-3 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">Columns</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          
          {isColumnSelectorOpen && (
            <div className="absolute left-0 sm:right-auto top-full mt-2 w-64 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-md shadow-lg z-50 max-h-96 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-[var(--card-border)] bg-[var(--bg-elevated)] text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Standard Columns
              </div>
              <div className="overflow-y-auto p-2 space-y-1">
                {STANDARD_COLUMNS.map(col => (
                  <label key={col.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-primary)]">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                      className="rounded border-[var(--border)] accent-[var(--accent)]"
                    />
                    {col.label}
                  </label>
                ))}
                
                {metadataKeys.length > 0 && (
                  <>
                    <div className="pt-2 pb-1 mt-2 border-t border-[var(--card-border)] text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Metadata Columns
                    </div>
                    {metadataKeys.map(key => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-primary)]">
                        <input 
                          type="checkbox" 
                          checked={visibleColumns.includes(key)}
                          onChange={() => toggleColumn(key)}
                          className="rounded border-[var(--border)] accent-[var(--accent)]"
                        />
                        <span className="truncate">{key}</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={exportFiltered}
          className="flex items-center gap-1 h-8 px-3 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Download size={12} />
          Export
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col border border-[var(--card-border)] rounded-lg overflow-hidden bg-[var(--card-bg)] shadow-sm">
          <AdminTable 
            isLoading={isLoading}
            isEmpty={paginatedLogs.length === 0}
            className="flex-1 max-h-none border-0 rounded-none shadow-none text-[11px]"
            headers={[
              ...visibleColumns.map(colId => {
                const standardCol = STANDARD_COLUMNS.find(c => c.id === colId)
                return <SortableHeader key={colId} column={colId} label={standardCol?.label || colId} />
              }),
              "" // Action column
            ]}
          >
            {paginatedLogs.map(log => (
              <tr key={log.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors h-[40px]">
                {visibleColumns.map(colId => {
                  return (
                    <td key={colId} className="px-3">
                      {colId === "created_at" && (
                        <span className="text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString(undefined, {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </span>
                      )}
                      {colId === "app_name" && <span className="text-muted-foreground whitespace-nowrap">{log.app_name}</span>}
                      {colId === "level" && (
                        <StatusBadge variant={log.level === "error" ? "error" : log.level === "warn" ? "warning" : "info"}>
                          {log.level}
                        </StatusBadge>
                      )}
                      {colId === "message" && (
                        <div className="max-w-[200px] truncate font-medium" title={log.message}>
                          {log.message}
                        </div>
                      )}
                      {colId === "request_id" && (
                        <div className="flex items-center">
                          {log.request_id ? <CopyField value={log.request_id} truncate={8} masked={false} /> : <span className="text-muted-foreground">—</span>}
                        </div>
                      )}
                      {colId === "method" && (
                        <div className="flex items-center gap-1">
                          {log.method && <span className="font-mono text-[10px] bg-muted px-1 rounded text-muted-foreground">{log.method}</span>}
                        </div>
                      )}
                      {colId === "url" && (
                        <span className="text-muted-foreground truncate max-w-[150px] inline-block" title={log.url}>{log.url || "—"}</span>
                      )}
                      {colId === "status" && (
                        <span className={`font-mono ${!log.status ? "text-muted-foreground" : log.status >= 500 ? "text-[var(--error)]" : log.status >= 400 ? "text-[var(--warning)]" : "text-[var(--success)]"}`}>
                          {log.status || "—"}
                        </span>
                      )}
                      {colId === "duration" && (
                        <span className="font-mono text-muted-foreground">{log.duration ? `${log.duration}ms` : "—"}</span>
                      )}
                      {colId === "credits_deducted" && (
                        <span className="font-mono text-muted-foreground">{log.credits_deducted ? `−${log.credits_deducted}` : "—"}</span>
                      )}
                      {colId === "user_id" && (
                        <span className="text-muted-foreground truncate max-w-[120px] inline-block" title={log.user_id}>{log.user_id || "—"}</span>
                      )}
                      {colId === "api_key" && (
                        <span className="font-mono text-muted-foreground truncate max-w-[100px] inline-block" title={log.api_key}>{log.api_key ? log.api_key.substring(0, 16) + '...' : "—"}</span>
                      )}
                      {colId === "response_data" && (
                        <JsonTooltip data={log.response_data} />
                      )}
                      
                      {/* Dynamic Metadata Columns */}
                      {!STANDARD_COLUMNS.find(c => c.id === colId) && (
                        <span className="text-muted-foreground truncate max-w-[150px] inline-block font-mono text-[10px]" title={String(log.metadata?.[colId] ?? "—")}>
                          {log.metadata?.[colId] !== undefined && log.metadata?.[colId] !== null && log.metadata?.[colId] !== "" 
                            ? (typeof log.metadata[colId] === 'object' ? JSON.stringify(log.metadata[colId]) : String(log.metadata[colId])) 
                            : "—"}
                        </span>
                      )}
                    </td>
                  )
                })}
                
                <td className="px-3 text-right">
                  <button 
                    onClick={() => setSelectedLog(log)}
                    className="p-1.5 rounded text-muted-foreground hover:bg-background border border-transparent hover:border-border transition-colors shadow-sm"
                    title="View full log"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </AdminTable>
        
        {/* Pagination controls */}
        {(paginatedResponse?.meta?.total_items || 0) > 0 && (
          <div className="flex flex-wrap items-center justify-between p-3 shrink-0 border-t border-[var(--border)] bg-[var(--card-bg)] mt-auto z-10 relative">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <select 
                className="bg-background border border-border rounded px-2 py-1 text-foreground"
                value={itemsPerPage}
                onChange={(e) => {
                  const val = e.target.value;
                  setItemsPerPage(val === "All" ? "All" : Number(val));
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="All">All</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4 mt-4 sm:mt-0">
              <div className="text-sm text-muted-foreground">
                {itemsPerPage === "All" ? (
                  `Showing all ${paginatedResponse?.meta?.total_items || 0} results`
                ) : (
                  `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, paginatedResponse?.meta?.total_items || 0)} of ${paginatedResponse?.meta?.total_items || 0} results`
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Previous
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || itemsPerPage === "All"}
                  className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <LogDetailSlideOver log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  )
}

function LogDetailSlideOver({ log, onClose }: { log: LogEntry | null; onClose: () => void }) {
  const navigate = useNavigate()
  if (!log) return null

  return (
    <SlideOver open={!!log} onClose={onClose} title="Log Detail">
      <div className="space-y-6">
        <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
          <div className="text-muted-foreground">Level</div>
          <div>
            <StatusBadge variant={log.level === "error" ? "error" : log.level === "warn" ? "warning" : "info"}>
              {log.level}
            </StatusBadge>
          </div>
          
          <div className="text-muted-foreground">Timestamp</div>
          <div className="font-mono text-xs">{new Date(log.created_at).toISOString()}</div>
          
          <div className="text-muted-foreground">Request ID</div>
          <div className="font-mono text-xs">{log.request_id || "—"}</div>

          {log.method && (
            <>
              <div className="text-muted-foreground">Method</div>
              <div className="font-mono text-xs">{log.method}</div>
            </>
          )}

          {log.url && (
            <>
              <div className="text-muted-foreground">URL</div>
              <div className="font-mono text-xs break-all">{log.url}</div>
            </>
          )}

          {log.status && (
            <>
              <div className="text-muted-foreground">Status</div>
              <div className="font-mono text-xs">{log.status}</div>
            </>
          )}

          {log.duration && (
            <>
              <div className="text-muted-foreground">Duration</div>
              <div className="font-mono text-xs">{log.duration}ms</div>
            </>
          )}

          <div className="text-muted-foreground">App</div>
          <div>{log.app_name}</div>

          {log.api_key && (
            <>
              <div className="text-muted-foreground">API Key</div>
              <div><CopyField value={log.api_key} /></div>
            </>
          )}

          {log.user_id && (
            <>
              <div className="text-muted-foreground">User ID</div>
              <div><CopyField value={log.user_id} /></div>
            </>
          )}

          {log.credits_deducted && (
            <>
              <div className="text-muted-foreground">Credits</div>
              <div className="font-mono text-xs text-[var(--error)]">−{log.credits_deducted}</div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Message</h3>
          <div className="p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap break-words">
            {log.message}
          </div>
        </div>

        {log.response_data && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Response Data</h3>
            <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {typeof log.response_data === 'object' 
                ? JSON.stringify(log.response_data, null, 2) 
                : String(log.response_data)}
            </pre>
          </div>
        )}

          {log.metadata && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Metadata</h3>
            <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* ── Langfuse shortcuts ─────────────────────────────────── */}
        {log.api_key && (
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <button
              className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline text-left"
              onClick={() => { navigate(`/langfuse?key=${encodeURIComponent(log.api_key!)}`); onClose(); }}
            >
              <FlaskConical size={12} />
              View key traces in Langfuse →
            </button>
            {log.request_id && (
              <button
                className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline text-left"
                onClick={() => { navigate(`/langfuse?session=${encodeURIComponent(log.request_id!)}`); onClose(); }}
              >
                <FlaskConical size={12} />
                Find LLM calls for this request →
              </button>
            )}
          </div>
        )}
      </div>
    </SlideOver>
  )
}

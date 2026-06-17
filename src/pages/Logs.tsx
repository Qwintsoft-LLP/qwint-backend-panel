import { useState, useEffect, useMemo, useRef } from "react"
import { useLogs, LogEntry } from "@/hooks/useLogs"
import AdminTable from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"
import SlideOver from "@/components/shared/SlideOver"
import { ExternalLink, RefreshCw, Settings, ChevronDown, Download, AlertTriangle } from "lucide-react"
import { exportToCsv } from "@/lib/export"
import { useLogFilters } from "@/hooks/useLogFilters"
import { cn } from "@/lib/utils"

const STANDARD_COLUMNS = [
  { id: "created_at", label: "Time" },
  { id: "app_name", label: "App" },
  { id: "level", label: "Level" },
  { id: "message", label: "Message" },
  { id: "method", label: "Method" },
  { id: "url", label: "URL" },
  { id: "status", label: "Status" },
  { id: "duration", label: "Duration" },
  { id: "credits_deducted", label: "Credits" },
  { id: "user_id", label: "User ID" },
  { id: "api_key", label: "API Key" },
]

export default function Logs() {
  const [fetchLimit, setFetchLimit] = useState(2000)
  const { data: logs, isLoading, refetch } = useLogs(fetchLimit)
  const filters = useLogFilters()
  
  const [live, setLive] = useState(false)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  
  const [sortColumn, setSortColumn] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [itemsPerPage, setItemsPerPage] = useState<number | "All">(50)
  const [currentPage, setCurrentPage] = useState(1)

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
    return ["created_at", "app_name", "level", "message", "method", "status", "duration", "api_key"]
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
  }, [filters.search, filters.level, filters.app, sortColumn, sortDirection, itemsPerPage, filters.dateFrom, filters.dateTo])

  const filteredLogs = logs?.filter(log => {
    const search = filters.search;
    const matchesSearch = search === "" || 
      log.message?.toLowerCase().includes(search.toLowerCase()) || 
      log.url?.toLowerCase().includes(search.toLowerCase()) ||
      log.api_key?.includes(search) ||
      log.user_id?.includes(search)
    
    const matchesLevel = filters.level === "all" || log.level === filters.level
    const matchesApp = filters.app === "all" || log.app_name === filters.app
    
    const logDate = new Date(log.created_at)
    const matchesStartDate = !filters.dateFrom || logDate >= new Date(filters.dateFrom)
    const matchesEndDate = !filters.dateTo || logDate <= new Date(filters.dateTo + 'T23:59:59.999Z')
    
    return matchesSearch && matchesLevel && matchesApp && matchesStartDate && matchesEndDate
  })?.sort((a, b) => {
    if (!sortColumn) return 0
    let aVal = (a as any)[sortColumn] ?? a.metadata?.[sortColumn]
    let bVal = (b as any)[sortColumn] ?? b.metadata?.[sortColumn]
    
    if (aVal === undefined) aVal = ""
    if (bVal === undefined) bVal = ""
    
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
    return 0
  }) || []

  const logStats = useMemo(() => ({
    total:    filteredLogs.length,
    errors:   filteredLogs.filter(l => l.level === "error").length,
    avgMs:    filteredLogs.filter(l => l.duration).reduce((s, l, _, a) => s + Number(l.duration ?? 0) / a.length, 0),
    credits:  filteredLogs.reduce((s, l) => s + Number(l.credits_deducted ?? 0), 0),
  }), [filteredLogs])

  const totalPages = itemsPerPage === "All" ? 1 : Math.ceil(filteredLogs.length / itemsPerPage)
  const paginatedLogs = itemsPerPage === "All" 
    ? filteredLogs 
    : filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const appNames = Array.from(new Set(logs?.map(l => l.app_name).filter(Boolean)))

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
    exportToCsv(`logs-${Date.now()}.csv`, filteredLogs.map(l => ({
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
    <div className="space-y-4 flex flex-col h-full">
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
          <select 
            className="h-8 px-2 text-sm bg-card border border-border rounded-md text-foreground cursor-pointer hover:bg-muted transition-colors"
            value={fetchLimit}
            onChange={e => setFetchLimit(Number(e.target.value))}
            title="Max logs to fetch from server"
          >
            <option value={100}>Fetch 100</option>
            <option value={500}>Fetch 500</option>
            <option value={2000}>Fetch 2000</option>
            <option value={5000}>Fetch 5000</option>
            <option value={10000}>Fetch 10000</option>
          </select>
          <button 
            onClick={() => refetch()}
            className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors bg-card"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span>Showing <strong className="text-[var(--text-primary)]">{logStats.total}</strong> entries</span>
        <span>·</span>
        <span><strong className="text-[var(--error)]">{logStats.errors}</strong> errors</span>
        <span>·</span>
        <span>Avg <strong className="text-[var(--text-primary)]">{logStats.avgMs.toFixed(0)}ms</strong></span>
        <span>·</span>
        <span><strong className="text-[var(--text-primary)]">{logStats.credits.toFixed(2)}</strong> cr deducted</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-[var(--card-bg)] p-3 border border-[var(--card-border)] rounded-md shrink-0">
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
          className="h-8 px-3 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md w-36"
          value={filters.app}
          onChange={e => filters.setApp(e.target.value)}
        >
          <option value="all">All Apps</option>
          {appNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

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
            <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-md shadow-lg z-50 max-h-96 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Standard Columns
              </div>
              <div className="overflow-y-auto p-2 space-y-1">
                {STANDARD_COLUMNS.map(col => (
                  <label key={col.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-muted rounded">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                      className="rounded bg-background border-border accent-[var(--accent)]"
                    />
                    {col.label}
                  </label>
                ))}
                
                {metadataKeys.length > 0 && (
                  <>
                    <div className="pt-2 pb-1 mt-2 border-t border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Metadata Columns
                    </div>
                    {metadataKeys.map(key => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer p-1 hover:bg-muted rounded">
                        <input 
                          type="checkbox" 
                          checked={visibleColumns.includes(key)}
                          onChange={() => toggleColumn(key)}
                          className="rounded bg-background border-border accent-[var(--accent)]"
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

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <AdminTable 
            isLoading={isLoading}
            isEmpty={paginatedLogs.length === 0}
            className="text-[11px]"
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
                      {colId === "method" && (
                        <div className="flex items-center gap-1">
                          {log.method && <span className="font-mono text-[10px] bg-muted px-1 rounded text-muted-foreground">{log.method}</span>}
                          {log.request_id && <span className="text-muted-foreground text-[10px] font-mono truncate max-w-[60px]" title={log.request_id}>{log.request_id.substring(0, 8)}</span>}
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
        </div>
        
        {/* Pagination controls */}
        {filteredLogs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between py-4 px-2 shrink-0 border-t border-border mt-auto">
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
                  `Showing all ${filteredLogs.length} results`
                ) : (
                  `Showing ${(currentPage - 1) * itemsPerPage + 1} to ${Math.min(currentPage * itemsPerPage, filteredLogs.length)} of ${filteredLogs.length} results`
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

        {log.metadata && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Metadata</h3>
            <pre className="p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </SlideOver>
  )
}

import  "react"
import { Activity, Key, CreditCard, AlertCircle, Clock, Timer, Gauge } from "lucide-react"
import { useApiKeys } from "@/hooks/useApiKeys"
import { useWalletBalances } from "@/hooks/useWallets"
import { useLogs } from "@/hooks/useLogs"
import StatusBadge from "@/components/shared/StatusBadge"
import { formatCredits, formatDuration } from "@/lib/utils"
import { StatsBar } from "@/components/shared/StatsBar"
import { CreditBurnChart } from "@/components/charts/CreditBurnChart"
import { LogLevelChart } from "@/components/charts/LogLevelChart"
import { BudgetHealthChart } from "@/components/charts/BudgetHealthChart"
import { cn } from "@/lib/utils"

export default function Dashboard() {
  const { data: keys = [], isLoading: keysLoading } = useApiKeys()
  const { data: balances = [], isLoading: walletsLoading } = useWalletBalances()
  const { data: logs = [], isLoading: logsLoading } = useLogs()

  // Primary Metrics
  const activeKeysCount = keys.filter(k => k.is_active).length
  const inactiveKeysCount = keys.length - activeKeysCount
  const totalBudget = keys.reduce((sum, k) => sum + Number(k.budget || 0), 0)
  const lowBudgetKeysCount = keys.filter(k => k.remaining_budget < 10).length
  const systemErrors = logs.filter(l => l.level === "error").length
  
  // Recent credits used (simplified for demo)
  const totalRemainingBudget = keys.reduce((sum, k) => sum + Number(k.remaining_budget || 0), 0)
  const recentCreditsUsed = totalBudget - totalRemainingBudget

  // Operational Metrics
  const budgetUtilization = totalBudget > 0 ? ((recentCreditsUsed / totalBudget) * 100).toFixed(1) : "0"
  const neverUsedKeysCount = keys.filter(k => !k.last_used).length
  
  const logsWithDuration = logs.filter(l => typeof l.duration === 'number')
  const avgResponseTime = logsWithDuration.length > 0 
    ? (logsWithDuration.reduce((acc, l) => acc + (l.duration || 0), 0) / logsWithDuration.length).toFixed(0) 
    : "0"

  const errorRate = logs.length > 0 ? ((systemErrors / logs.length) * 100).toFixed(1) : "0"

  // Stats Bar Computations
  const avgBudget = keys.length ? (totalBudget / keys.length).toFixed(0) : "0"
  const appCounts = logs.reduce<Record<string, number>>((acc, l) => {
    if (l.app_name) {
      acc[l.app_name] = (acc[l.app_name] ?? 0) + 1
    }
    return acc
  }, {})
  const topApp = Object.entries(appCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
  
  const usedToday = keys.filter(k => {
    if (!k.last_used) return false;
    return new Date(k.last_used).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="space-y-6">
      {/* 2 Rows of 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active API Keys"
          value={keysLoading ? "..." : activeKeysCount.toString()}
          subValue={keysLoading ? null : `${inactiveKeysCount} inactive`}
          icon={<Key className="w-5 h-5 text-muted-foreground" />}
        />
        <MetricCard 
          label="Budget Allocated" 
          value={keysLoading ? "..." : formatCredits(totalBudget)} 
          subValue={keysLoading ? null : `${lowBudgetKeysCount} keys have < $10 left`}
          icon={<CreditCard className="w-5 h-5 text-muted-foreground" />} 
        />
        <MetricCard
          label="System Errors"
          value={logsLoading ? "..." : systemErrors.toString()}
          subValue={logsLoading ? null : `of ${logs.length} recent`}
          icon={<AlertCircle className="w-5 h-5 text-muted-foreground" />}
        />
        <MetricCard 
          label="Credits Used (Recent)" 
          value={keysLoading ? "..." : formatCredits(recentCreditsUsed)} 
          subValue={keysLoading ? null : formatDuration(recentCreditsUsed)}
          icon={<Activity className="w-5 h-5 text-muted-foreground" />} 
        />
        
        <MetricCard
          label="Budget Utilization"
          value={keysLoading ? "..." : `${budgetUtilization}%`}
          icon={<Gauge className="w-5 h-5 text-muted-foreground" />}
        />
        <MetricCard
          label="Keys Never Used"
          value={keysLoading ? "..." : neverUsedKeysCount.toString()}
          icon={<Clock className="w-5 h-5 text-muted-foreground" />}
        />
        <MetricCard
          label="Avg Response Time"
          value={logsLoading ? "..." : `${avgResponseTime} ms`}
          icon={<Timer className="w-5 h-5 text-muted-foreground" />}
        />
        <MetricCard
          label="Error Rate"
          value={logsLoading ? "..." : `${errorRate}%`}
          icon={<AlertCircle className="w-5 h-5 text-muted-foreground" />}
        />
      </div>

      <StatsBar stats={[
        { label: "Total Keys",     value: keys.length },
        { label: "Total Budget",   value: `$${totalBudget.toLocaleString()}` },
        { label: "Avg Key Budget", value: `$${avgBudget}` },
        { label: "Top App",        value: topApp },
        { label: "Keys Used Today",value: usedToday },
      ]} />

      {/* Activity and Wallets (Original) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 border border-[var(--card-border)] rounded-md bg-[var(--card-bg)] admin-card">
          <div className="p-4 border-b border-[var(--card-border)] bg-[var(--bg-elevated)]">
            <h3 className="font-medium text-sm">Recent Activity</h3>
          </div>
          <div className="p-4 flex-1 overflow-auto h-64">
            {logsLoading ? (
              <p className="text-sm text-muted-foreground text-center mt-10">Loading activity...</p>
            ) : (
              <div className="space-y-4">
                {logs.slice(0, 10).map((log, i) => (
                  <div key={log.id || i} className="flex items-start gap-3">
                    <StatusBadge variant={log.level === 'error' ? 'error' : log.level === 'warn' ? 'warning' : 'info'}>
                      {log.level}
                    </StatusBadge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.app_name} • {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 border border-[var(--card-border)] rounded-md bg-[var(--card-bg)] admin-card">
          <div className="p-4 border-b border-[var(--card-border)] bg-[var(--bg-elevated)]">
            <h3 className="font-medium text-sm">Wallet Transactions</h3>
          </div>
          <div className="p-4 flex-1 overflow-auto h-64">
            {walletsLoading ? (
              <p className="text-sm text-muted-foreground text-center mt-10">Loading balances...</p>
            ) : (
              <div className="space-y-4">
                {balances.slice(0, 10).map((b, i) => (
                  <div key={b.user_id || i} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.user_id}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.name || b.mobile || "Unknown user"}</p>
                    </div>
                    <span className="font-mono text-sm">{formatCredits(b.balance_credits || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
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
          <BudgetHealthChart keys={keys} />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ value, subValue, label, icon }: { value: React.ReactNode; subValue?: React.ReactNode; label: string; icon?: React.ReactNode }) {
  return (
    <div className={cn(
      "admin-card stat-card border border-[var(--card-border)] rounded-md p-4 bg-[var(--card-bg)] relative overflow-hidden group hover:bg-[var(--bg-hover)] transition-colors"
    )}>
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs text-[var(--text-secondary)] font-medium">{label}</div>
        {icon && <div className="text-[var(--text-muted)] opacity-70">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-mono font-medium text-[var(--text-primary)]">{value}</div>
        {subValue && <div className="text-xs text-[var(--text-muted)] font-mono">{subValue}</div>}
      </div>
    </div>
  )
}

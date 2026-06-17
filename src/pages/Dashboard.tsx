import { Activity, Key, CreditCard, AlertCircle } from "lucide-react"
import { useApiKeys } from "@/hooks/useApiKeys"
import { useWalletBalances } from "@/hooks/useWallets"
import { useLogs } from "@/hooks/useLogs"
import StatusBadge from "@/components/shared/StatusBadge"
import { formatCredits, formatDuration } from "@/lib/utils"

export default function Dashboard() {
  const { data: keys, isLoading: keysLoading } = useApiKeys()
  const { data: balances, isLoading: walletsLoading } = useWalletBalances()
  const { data: logs, isLoading: logsLoading } = useLogs()

  const activeKeysCount = keys?.filter(k => k.is_active).length || 0
  const totalBudget = keys?.reduce((sum, k) => sum + Number(k.budget || 0), 0) || 0
  const totalRemainingBudget = keys?.reduce((sum, k) => sum + Number(k.remaining_budget || 0), 0) || 0
  const systemErrors = logs?.filter(l => l.level === "error").length || 0

  const recentCreditsUsed = totalBudget - totalRemainingBudget

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Active API Keys"
          value={keysLoading ? "..." : activeKeysCount.toString()}
          icon={<Key className="w-5 h-5 text-muted-foreground" />}
        />
        <MetricCard 
          label="Budget Allocated" 
          value={keysLoading ? "..." : formatCredits(totalBudget)} 
          subValue={keysLoading ? null : `(${formatDuration(totalBudget)})`}
          icon={<CreditCard className="w-5 h-5 text-muted-foreground" />} 
        />
        <MetricCard
          label="System Errors"
          value={logsLoading ? "..." : systemErrors.toString()}
          icon={<AlertCircle className="w-5 h-5 text-muted-foreground" />}
        />
        <MetricCard 
          label="Total Credits Used" 
          value={keysLoading ? "..." : formatCredits(recentCreditsUsed)} 
          subValue={keysLoading ? null : `(${formatDuration(recentCreditsUsed)})`}
          icon={<Activity className="w-5 h-5 text-muted-foreground" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 border border-border rounded-md bg-card">
          <div className="p-4 border-b border-border bg-elevated/30">
            <h3 className="font-medium text-sm">Recent Activity</h3>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {logsLoading ? (
              <p className="text-sm text-muted-foreground text-center mt-10">Loading activity...</p>
            ) : (
              <div className="space-y-4">
                {logs?.slice(0, 10).map((log, i) => (
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

        <div className="lg:col-span-2 border border-border rounded-md bg-card">
          <div className="p-4 border-b border-border bg-elevated/30">
            <h3 className="font-medium text-sm">Wallet Transactions</h3>
          </div>
          <div className="p-4 flex-1 overflow-auto">
            {walletsLoading ? (
              <p className="text-sm text-muted-foreground text-center mt-10">Loading balances...</p>
            ) : (
              <div className="space-y-4">
                {balances?.slice(0, 10).map((b, i) => (
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
    </div>
  )
}

function MetricCard({ value, subValue, label, icon }: { value: React.ReactNode; subValue?: React.ReactNode; label: string; icon?: React.ReactNode }) {
  return (
    <div className="border border-border rounded-md bg-card p-4 relative overflow-hidden group hover:bg-muted/30 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
        {icon && <div className="text-muted-foreground/50">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-mono font-medium text-foreground">{value}</div>
        {subValue && <div className="text-xs text-muted-foreground font-mono">{subValue}</div>}
      </div>
    </div>
  )
}

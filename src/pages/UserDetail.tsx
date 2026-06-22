import { useParams, useNavigate } from "react-router-dom"
import { useWalletBalances, useUserTransactions } from "@/hooks/useWallets"
import { useApiKeys } from "@/hooks/useApiKeys"
import { ArrowLeft, Wallet, Activity, Key } from "lucide-react"
import StatusBadge from "@/components/shared/StatusBadge"
import AdminTable from "@/components/shared/AdminTable"
import { formatCredits } from "@/lib/utils"

export default function UserDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  
  const { data: users, isLoading: usersLoading } = useWalletBalances()
  const { data: transactions, isLoading: txLoading } = useUserTransactions(userId || "")
  const { data: allKeys, isLoading: keysLoading } = useApiKeys()
  
  let user = users?.find(u => u.user_id === userId)
  
  // If not found in wallets, try to find them in API Keys (Qwint Caption user)
  if (!user) {
    const keyUser = allKeys?.find(k => k.key === userId || k.username === userId)
    if (keyUser) {
      user = {
        user_id: keyUser.key,
        name: keyUser.username,
        mobile: "—",
        balance_credits: keyUser.remaining_budget,
        is_active: keyUser.is_active,
        created_at: keyUser.created_at,
        app_name: "Qwint Caption"
      } as any
    }
  }
  
  // Try to match API keys to user.
  const userKeys = allKeys?.filter(k => 
    k.key === userId ||
    k.username === userId || 
    (user?.mobile && k.username === user.mobile) ||
    (user?.name && k.username === user.name)
  ) || []

  // Calculated from transactions if needed, but we already have user.balance_credits
  const totalBalance = transactions?.reduce((acc, t) => {
    return t.type === "CREDIT" ? acc + Number(t.amount) : acc - Number(t.amount)
  }, 0)

  if (usersLoading || keysLoading) return <div className="p-8 text-center text-muted-foreground">Loading user details...</div>
  if (!user) return <div className="p-8 text-center text-muted-foreground">User not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <button 
          onClick={() => navigate("/users")}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{user?.name || user?.mobile || user?.user_id}</h1>
          <p className="text-sm text-muted-foreground mt-1">User ID: {user?.user_id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusBadge variant={user?.is_active ? "success" : "error"}>
            {user?.is_active ? "ACTIVE" : "INACTIVE"}
          </StatusBadge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <div className="admin-card border border-[var(--card-border)] rounded-md p-4 bg-[var(--card-bg)]">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs text-[var(--text-secondary)] font-medium">Current Balance</div>
            <Wallet className="w-5 h-5 text-muted-foreground opacity-70" />
          </div>
          <div className="text-2xl font-mono font-medium text-[var(--text-primary)]">
            {formatCredits(user?.balance_credits || 0)}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            Calculated Net: {totalBalance?.toFixed(2)} cr
          </div>
        </div>
        
        {/* Keys Card */}
        <div className="admin-card border border-[var(--card-border)] rounded-md p-4 bg-[var(--card-bg)]">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs text-[var(--text-secondary)] font-medium">API Keys</div>
            <Key className="w-5 h-5 text-muted-foreground opacity-70" />
          </div>
          <div className="text-2xl font-mono font-medium text-[var(--text-primary)]">
            {userKeys.length}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {userKeys.filter(k => k.is_active).length} active keys
          </div>
        </div>

        {/* Join Date Card */}
        <div className="admin-card border border-[var(--card-border)] rounded-md p-4 bg-[var(--card-bg)]">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs text-[var(--text-secondary)] font-medium">Join Date</div>
            <Activity className="w-5 h-5 text-muted-foreground opacity-70" />
          </div>
          <div className="text-lg font-medium text-[var(--text-primary)] mt-1">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {user?.created_at ? new Date(user.created_at).toLocaleTimeString() : "—"}
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium tracking-tight border-b border-border pb-2 mt-8">Transaction History</h3>
        <AdminTable 
          isLoading={txLoading}
          isEmpty={transactions?.length === 0}
          headers={["Date", "Type", "Amount", "App", "Status", "Description"]}
        >
          {transactions?.map(t => (
            <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors h-[40px]">
              <td className="px-3 text-muted-foreground whitespace-nowrap text-xs">
                {new Date(t.created_at).toLocaleString()}
              </td>
              <td className="px-3">
                <StatusBadge variant={t.type === "CREDIT" ? "success" : "error"}>
                  {t.type}
                </StatusBadge>
              </td>
              <td className={`px-3 text-right font-mono font-medium ${t.type === "CREDIT" ? "text-success" : "text-error"}`}>
                {t.type === "CREDIT" ? "+" : "−"}{t.amount}
              </td>
              <td className="px-3 text-xs text-muted-foreground">{t.app_name || "—"}</td>
              <td className="px-3">
                <StatusBadge variant={t.status === "completed" ? "success" : t.status === "failed" ? "error" : "warning"}>
                  {t.status}
                </StatusBadge>
              </td>
              <td className="px-3 text-sm">{t.description}</td>
            </tr>
          ))}
        </AdminTable>
      </div>

      {/* API Keys Section */}
      {userKeys.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium tracking-tight border-b border-border pb-2 mt-8">API Keys</h3>
          <AdminTable 
            isLoading={keysLoading}
            isEmpty={userKeys.length === 0}
            headers={["Key", "Budget", "Remaining", "Status", "Last Used"]}
          >
            {userKeys.map(k => (
              <tr key={k.key} className="border-b border-border/50 hover:bg-muted/50 transition-colors h-[40px]">
                <td className="px-3 font-mono text-sm">{k.key}</td>
                <td className="px-3 font-mono text-sm">{formatCredits(k.budget)}</td>
                <td className="px-3 font-mono text-sm">{formatCredits(k.remaining_budget)}</td>
                <td className="px-3">
                  <StatusBadge variant={k.is_active ? "success" : "error"}>
                    {k.is_active ? "ACTIVE" : "INACTIVE"}
                  </StatusBadge>
                </td>
                <td className="px-3 text-xs text-muted-foreground">
                  {k.last_used ? new Date(k.last_used).toLocaleString() : "Never"}
                </td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useWalletBalances } from "@/hooks/useWallets"
import { useApiKeys } from "@/hooks/useApiKeys"
import AdminTable from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import { formatCredits } from "@/lib/utils"

export default function Users() {
  const navigate = useNavigate()
  const { data: users, isLoading } = useWalletBalances()
  const { data: allKeys } = useApiKeys()

  const [appFilter, setAppFilter] = useState<"ALL" | "QWINT_TALK" | "QWINT_CAPTION">("ALL")

  const combinedUsers = useMemo(() => {
    const list = [...(users || [])]
    const existingUsernames = new Set([
      ...list.map(u => u.user_id),
      ...list.map(u => u.mobile),
      ...list.map(u => u.name)
    ].filter(Boolean))
    
    allKeys?.forEach(k => {
      // If they are a Qwint Caption user, the API key itself is their User ID, 
      // the username is their Name, and the remaining budget is their balance.
      if (!existingUsernames.has(k.username)) {
        list.push({
          user_id: k.key,
          name: k.username,
          mobile: "—", 
          balance_credits: k.remaining_budget,
          is_active: k.is_active,
          created_at: k.created_at,
          app_name: "Qwint Caption"
        } as any)
        existingUsernames.add(k.username)
      }
    })
    return list
  }, [users, allKeys])

  const filteredUsers = combinedUsers.filter(user => {
    const hasApiKey = allKeys?.some(k => 
      k.username === user.user_id || 
      k.username === user.mobile ||
      k.username === user.name
    )
    
    if (appFilter === "QWINT_CAPTION") return hasApiKey
    if (appFilter === "QWINT_TALK") return !hasApiKey
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your users.</p>
        </div>
        <div>
          <select 
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-border rounded-md text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="ALL">All Applications</option>
            <option value="QWINT_TALK">Qwint Talk</option>
            <option value="QWINT_CAPTION">Qwint Caption</option>
          </select>
        </div>
      </div>

      <AdminTable 
        isLoading={isLoading}
        isEmpty={filteredUsers?.length === 0}
        headers={["User ID", "Name", "Mobile", "App", "Balance", "Status", "Joined"]}
      >
        {filteredUsers?.map(user => {
          // If we manually tagged them as Qwint Caption, or if their user_id matches an API key
          const isQwintCaption = (user as any).app_name === "Qwint Caption" || allKeys?.some(k => 
            k.username === user.user_id || 
            k.username === user.mobile ||
            k.username === user.name
          )
          const appName = isQwintCaption ? "Qwint Caption" : "Qwint Talk"
          
          return (
          <tr 
            key={user.user_id} 
            className="border-b border-border/50 hover:bg-muted/50 transition-colors h-[40px] cursor-pointer"
            onClick={() => navigate(`/users/${user.user_id}`)}
          >
            <td className="px-3 text-sm font-medium">{user.user_id}</td>
            <td className="px-3 text-sm">{user.name || "—"}</td>
            <td className="px-3 text-sm text-muted-foreground">{user.mobile || "—"}</td>
            <td className="px-3">
              <StatusBadge variant={isQwintCaption ? "info" : "warning"}>
                {appName}
              </StatusBadge>
            </td>
            <td className="px-3 text-sm font-mono">{formatCredits(user.balance_credits)}</td>
            <td className="px-3">
              <StatusBadge variant={user.is_active ? "success" : "error"}>
                {user.is_active ? "ACTIVE" : "INACTIVE"}
              </StatusBadge>
            </td>
            <td className="px-3 text-xs text-muted-foreground whitespace-nowrap">
              {new Date(user.created_at).toLocaleDateString()}
            </td>
          </tr>
          )
        })}
      </AdminTable>
    </div>
  )
}

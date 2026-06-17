import { useState } from "react"
import { useWalletBalances, useTopup } from "@/hooks/useWallets"
import AdminTable from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"

import { formatDistanceToNow } from "date-fns"
import { formatCredits } from "@/lib/utils"
import { Plus } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"

export default function Wallets() {
  const { data: balances, isLoading } = useWalletBalances()
  const [search, setSearch] = useState("")
  const [topupUser, setTopupUser] = useState<string | null>(null)
  const navigate = useNavigate()

  const filteredBalances = balances?.filter(b => 
    b.user_id.toLowerCase().includes(search.toLowerCase()) || 
    (b.mobile && b.mobile.includes(search))
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTopupUser("")}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Manual Top-up
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-3 border border-border rounded-md">
        <input 
          type="text" 
          placeholder="Search user ID or mobile..."
          className="w-full sm:max-w-xs h-9 px-3 text-sm bg-background border border-border rounded-md"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <AdminTable 
        isLoading={isLoading}
        isEmpty={filteredBalances.length === 0}
        headers={["User ID", "Name", "Mobile", "Balance", "Status", "Joined", "Actions"]}
      >
        {filteredBalances.map(b => (
          <tr 
            key={b.user_id} 
            className="border-b border-border/50 hover:bg-muted/50 transition-colors h-[40px] cursor-pointer"
            onClick={() => navigate(`/wallets/${b.user_id}`)}
          >
            <td className="px-3" onClick={e => e.stopPropagation()}><CopyField value={b.user_id} truncate={8} /></td>
            <td className="px-3 text-muted-foreground">{b.name || "—"}</td>
            <td className="px-3 font-mono text-muted-foreground">{b.mobile ? b.mobile.replace(/(\d{4})$/, "****$1") : "—"}</td>
            <td className="px-3 text-right font-mono font-medium">{formatCredits(b.balance_credits)}</td>
            <td className="px-3">
              <StatusBadge variant={b.is_active ? "success" : "error"}>
                {b.is_active ? "Active" : "Inactive"}
              </StatusBadge>
            </td>
            <td className="px-3 text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
            </td>
            <td className="px-3 text-right space-x-3" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => navigate(`/wallets/${b.user_id}`)}
                className="text-accent hover:text-accent-hover text-sm font-medium"
              >
                View
              </button>
              <button 
                onClick={() => setTopupUser(b.user_id)}
                className="text-primary hover:underline text-sm font-medium"
              >
                Top-up
              </button>
            </td>
          </tr>
        ))}
      </AdminTable>

      <TopupModal 
        userId={topupUser} 
        open={topupUser !== null} 
        onClose={() => setTopupUser(null)} 
      />
    </div>
  )
}

function TopupModal({ userId, open, onClose }: { userId: string | null; open: boolean; onClose: () => void }) {
  const [selectedUserId, setSelectedUserId] = useState(userId || "")
  const [credits, setCredits] = useState("")
  const [note, setNote] = useState("")
  const topup = useTopup()
  const { toast } = useToast()

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!credits || Number(credits) <= 0) return alert("Credits must be positive")
    if (!note) return alert("Note is required")
    if (!selectedUserId && !userId) return alert("User ID is required")

    try {
      await topup.mutateAsync({
        user_id: userId || selectedUserId,
        credits: Number(credits),
        note
      })
      toast({ title: "Top-up successful", description: `Added ${credits} credits to wallet` })
      onClose()
      setCredits("")
      setNote("")
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Manual Wallet Top-up</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">User ID *</label>
              <input 
                required 
                type="text" 
                value={userId || selectedUserId} 
                onChange={e => setSelectedUserId(e.target.value)} 
                disabled={!!userId}
                className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm disabled:opacity-50" 
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Credits *</label>
              <input required type="number" min="1" step="1" value={credits} onChange={e => setCredits(e.target.value)} className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm" />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block">Note *</label>
              <input required type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm" placeholder="Reason for top-up" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/50 border-t border-border rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors">Cancel</button>
            <button disabled={topup.isPending} type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
              {topup.isPending ? "Adding..." : "Add Credits"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

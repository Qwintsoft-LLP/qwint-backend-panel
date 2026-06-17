import { useState } from "react"
import { Link } from "react-router-dom"
import { useApiKeys, useGenerateKey, useUpdateBudget, ApiKey } from "@/hooks/useApiKeys"
import AdminTable from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"
import SlideOver from "@/components/shared/SlideOver"
import { formatDistanceToNow } from "date-fns"
import { formatCredits } from "@/lib/utils"
import { Activity, MoreHorizontal, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ApiKeys() {
  const { data: keys, isLoading } = useApiKeys()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"All" | "Active" | "Inactive">("All")

  const [generateOpen, setGenerateOpen] = useState(false)
  const [updateBudgetKey, setUpdateBudgetKey] = useState<ApiKey | null>(null)

  const filteredKeys = keys?.filter(k => {
    const matchesSearch = k.username.toLowerCase().includes(search.toLowerCase()) || k.key.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === "All" || (filter === "Active" ? k.is_active : !k.is_active)
    return matchesSearch && matchesFilter
  }) || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="flex items-center gap-3">
          <button
            onClick={() => setGenerateOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate Key
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-3 border border-border rounded-md">
        <input
          type="text"
          placeholder="Search username or key..."
          className="w-full sm:max-w-xs h-9 px-3 text-sm bg-background border border-border rounded-md"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="h-9 px-3 text-sm bg-background border border-border rounded-md w-full sm:w-auto"
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
        >
          <option value="All">All Keys</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>
      </div>

      <AdminTable
        isLoading={isLoading}
        isEmpty={filteredKeys.length === 0}
        headers={["Username", "API Key", "Budget", "Remaining", "Status", "Created", "Last Used", "Note", "Actions"]}
      >
        {filteredKeys.map(k => {
          const remainingPercent = (k.remaining_budget / k.budget) * 100
          const remainingColor = remainingPercent >= 70 ? "text-success" : remainingPercent >= 30 ? "text-warning" : "text-error"

          return (
            <tr key={k.key} className="border-b border-border/50 hover:bg-muted/50 transition-colors h-[40px]">
              <td className="px-3 font-medium">{k.username}</td>
              <td className="px-3"><CopyField value={k.key} masked /></td>
              <td className="px-3 text-right font-mono">{formatCredits(k.budget)}</td>
              <td className={`px-3 text-right font-mono ${remainingColor}`}>
                {formatCredits(k.remaining_budget)}
              </td>
              <td className="px-3">
                <StatusBadge variant={k.is_active ? "success" : "neutral"}>
                  {k.is_active ? "Active" : "Inactive"}
                </StatusBadge>
              </td>
              <td className="px-3 text-muted-foreground whitespace-nowrap">
                <span title={new Date(k.created_at).toLocaleString()}>
                  {formatDistanceToNow(new Date(k.created_at), { addSuffix: true })}
                </span>
              </td>
              <td className="px-3 text-muted-foreground whitespace-nowrap">
                {k.last_used ? formatDistanceToNow(new Date(k.last_used), { addSuffix: true }) : "—"}
              </td>
              <td className="px-3 text-muted-foreground truncate max-w-[150px]" title={k.note}>
                {k.note || "—"}
              </td>
              <td className="px-3 text-right flex items-center justify-end gap-2">
                <Link
                  to={`/logs?search=${k.key}`}
                  className="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all"
                  title="View Logs"
                >
                  <Activity className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setUpdateBudgetKey(k)}
                  className="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all"
                  title="Update Budget"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </td>
            </tr>
          )
        })}
      </AdminTable>

      <GenerateKeySlideOver open={generateOpen} onClose={() => setGenerateOpen(false)} />
      <UpdateBudgetModal
        apiKey={updateBudgetKey}
        open={!!updateBudgetKey}
        onClose={() => setUpdateBudgetKey(null)}
      />
    </div>
  )
}

function GenerateKeySlideOver({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [username, setUsername] = useState("")
  const [budget, setBudget] = useState("100")
  const [note, setNote] = useState("")
  const [withZip, setWithZip] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)

  const generate = useGenerateKey()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await generate.mutateAsync({
        username,
        budget: parseFloat(budget),
        note,
        withZip
      })
      if (res?.api_key || res?.key) {
        setGeneratedKey(res.api_key || res.key)
      }
      if (withZip && res?.key) {
        window.location.href = `/api/v1/payments/download-plugin/${res.key}`
      }
    } catch (err: any) {
      alert("Failed to generate key: " + err.message)
    }
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Generate New API Key">
      {generatedKey ? (
        <div className="space-y-6">
          <div className="p-4 bg-success/10 border border-success/20 rounded-md text-success flex flex-col items-center justify-center text-center space-y-3">
            <div className="font-semibold">Key Generated Successfully</div>
            <div className="bg-background border border-success/30 px-4 py-2 rounded font-mono text-sm">
              {generatedKey}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Please copy this key now. It will not be shown again.
            </p>
          </div>
          <button
            onClick={() => {
              setGeneratedKey(null)
              setUsername("")
              setNote("")
              onClose()
            }}
            className="w-full h-9 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 font-medium text-sm"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Username *</label>
              <input required type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Budget ($)</label>
              <input required type="number" min="0" step="1" value={budget} onChange={e => setBudget(e.target.value)} className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Note</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm h-20 resize-none" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={withZip} onChange={e => setWithZip(e.target.checked)} className="rounded border-border bg-background" />
              <span className="text-sm">Also download Premiere Pro Plugin ZIP</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted">Cancel</button>
            <button disabled={generate.isPending} type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50">
              {generate.isPending ? "Generating..." : "Generate Key →"}
            </button>
          </div>
        </form>
      )}
    </SlideOver>
  )
}

function UpdateBudgetModal({ apiKey, open, onClose }: { apiKey: ApiKey | null; open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("")
  const [operation, setOperation] = useState<"credit" | "debit">("credit")
  const [description, setDescription] = useState("")
  const updateBudget = useUpdateBudget()
  const { toast } = useToast()

  if (!open || !apiKey) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) return alert("Amount must be greater than 0")
    if (!description) return alert("Description is required")

    try {
      await updateBudget.mutateAsync({
        key: apiKey.key,
        operation,
        amount: Number(amount),
        description
      })
      toast({ title: "Budget updated successfully" })
      onClose()
      setAmount("")
      setDescription("")
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Update Budget</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="bg-muted p-3 rounded-md text-sm grid gap-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Key:</span> <span className="font-mono">{apiKey.username} ({apiKey.key.slice(0, 12)}...)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Current Remaining:</span> <span className="font-mono font-medium">Seconds: {apiKey.remaining_budget} ({apiKey.remaining_budget / 60} min.)</span></div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <label className="text-sm font-medium">Operation</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input type="radio" name="operation" checked={operation === "credit"} onChange={() => setOperation("credit")} />
                    Credit
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-sm">
                    <input type="radio" name="operation" checked={operation === "debit"} onChange={() => setOperation("debit")} />
                    Debit
                  </label>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Amount *</label>
                <input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm" />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Description *</label>
                <input required type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm" placeholder="Reason for budget change" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/50 border-t border-border rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors">Cancel</button>
            <button disabled={updateBudget.isPending} type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50">
              {updateBudget.isPending ? "Applying..." : "Apply Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

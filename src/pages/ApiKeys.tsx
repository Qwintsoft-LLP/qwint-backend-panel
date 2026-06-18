import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import { useApiKeys, useGenerateKey, useUpdateBudget, ApiKey } from "@/hooks/useApiKeys"
import AdminTable, { Column } from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"
import SlideOver from "@/components/shared/SlideOver"
import { formatDistanceToNow } from "date-fns"
import { formatCredits } from "@/lib/utils"
import { Activity, MoreHorizontal, Plus, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { exportToCsv } from "@/lib/export"
import { ColumnToggle } from "@/components/shared/ColumnToggle"
import { getStorage, STORAGE_KEYS } from "@/lib/storage"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function ApiKeys() {
  const { data: keys = [], isLoading } = useApiKeys()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [budgetFilter, setBudgetFilter] = useState("all")
  const [usageFilter, setUsageFilter] = useState("all")

  const [generateOpen, setGenerateOpen] = useState(false)
  const [updateBudgetKey, setUpdateBudgetKey] = useState<ApiKey | null>(null)

  // Columns visibility state
  const [visibleCols, setVisibleCols] = useState([
    { key: "username", label: "Username", visible: true },
    { key: "key", label: "API Key", visible: true },
    { key: "budget", label: "Budget", visible: true },
    { key: "remaining", label: "Remaining", visible: true },
    { key: "status", label: "Status", visible: true },
    { key: "created", label: "Created", visible: true },
    { key: "last_used", label: "Last Used", visible: true },
    { key: "note", label: "Note", visible: true },
    { key: "actions", label: "Actions", visible: true },
  ])

  const toggleCol = (key: string, visible: boolean) => 
    setVisibleCols(p => p.map(c => c.key === key ? { ...c, visible } : c))

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Filtering
  const filteredKeys = useMemo(() => {
    return keys
      .filter(k => {
        if (!search) return true;
        return k.username.toLowerCase().includes(search.toLowerCase())
            || k.key.toLowerCase().includes(search.toLowerCase())
            || (k.note ?? "").toLowerCase().includes(search.toLowerCase());
      })
      .filter(k => statusFilter === "all" || (statusFilter === "active" ? k.is_active : !k.is_active))
      .filter(k => {
        if (budgetFilter === "all") return true;
        const pct = k.budget > 0 ? (k.remaining_budget / k.budget) * 100 : 0;
        if (budgetFilter === "healthy")  return pct >= 70;
        if (budgetFilter === "warning")  return pct >= 30 && pct < 70;
        if (budgetFilter === "critical") return pct > 0 && pct < 30;
        if (budgetFilter === "empty")    return k.remaining_budget <= 0;
        return true;
      })
      .filter(k => {
        if (usageFilter === "all")    return true;
        if (usageFilter === "used")   return !!k.last_used;
        if (usageFilter === "unused") return !k.last_used;
        if (usageFilter === "recent") {
          if (!k.last_used) return false;
          return new Date(k.last_used).toDateString() === new Date().toDateString();
        }
        return true;
      });
  }, [keys, search, statusFilter, budgetFilter, usageFilter])

  const activeFilterCount = [
    search, 
    statusFilter !== "all", 
    budgetFilter !== "all", 
    usageFilter !== "all"
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setBudgetFilter("all")
    setUsageFilter("all")
  }

  const toggleAll = () =>
    setSelected(s => s.size === filteredKeys.length
      ? new Set()
      : new Set(filteredKeys.map(k => k.key))
    );
  
  const toggle = (key: string) =>
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const exportSelected = () => {
    const toExport = filteredKeys.filter(k => selected.has(k.key));
    exportToCsv("api-keys-selected.csv", toExport as unknown as Record<string, unknown>[]);
  }

  const exportAll = () => {
    exportToCsv("api-keys.csv", filteredKeys as unknown as Record<string, unknown>[]);
  }

  // Sorting
  const sortFn = (key: string, dir: "asc" | "desc") => (a: ApiKey, b: ApiKey) => {
    const mul = dir === "asc" ? 1 : -1;
    switch (key) {
      case "username":         return mul * a.username.localeCompare(b.username);
      case "remaining":        return mul * (a.remaining_budget - b.remaining_budget);
      case "budget":           return mul * (a.budget - b.budget);
      case "created":          return mul * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "last_used": {
        const aT = a.last_used ? new Date(a.last_used).getTime() : 0;
        const bT = b.last_used ? new Date(b.last_used).getTime() : 0;
        return mul * (aT - bT);
      }
      default: return 0;
    }
  };

  // Columns definition
  const columnsDef: Column<ApiKey>[] = [
    {
      key: "select",
      header: <input type="checkbox" checked={selected.size === filteredKeys.length && filteredKeys.length > 0} onChange={toggleAll} className="accent-[var(--accent)]" />,
      cell: (r) => <input type="checkbox" checked={selected.has(r.key)} onChange={() => toggle(r.key)} className="accent-[var(--accent)]" />
    },
    {
      key: "username",
      header: "Username",
      sortable: true,
      cell: (r) => <span className="font-medium">{r.username}</span>
    },
    {
      key: "key",
      header: "API Key",
      cell: (r) => <CopyField value={r.key} masked />
    },
    {
      key: "budget",
      header: "Budget",
      align: "right",
      sortable: true,
      cell: (r) => <span className="font-mono">{formatCredits(r.budget)}</span>
    },
    {
      key: "remaining",
      header: "Remaining",
      align: "right",
      sortable: true,
      cell: (r) => {
        const remainingPercent = r.budget > 0 ? (r.remaining_budget / r.budget) * 100 : 0
        const remainingColor = remainingPercent >= 70 ? "text-[var(--success)]" : remainingPercent >= 30 ? "text-[var(--warning)]" : "text-[var(--error)]"
        return <span className={`font-mono ${remainingColor}`}>{formatCredits(r.remaining_budget)}</span>
      }
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <StatusBadge variant={r.is_active ? "success" : "neutral"}>
          {r.is_active ? "Active" : "Inactive"}
        </StatusBadge>
      )
    },
    {
      key: "created",
      header: "Created",
      sortable: true,
      cell: (r) => (
        <span className="text-muted-foreground whitespace-nowrap" title={new Date(r.created_at).toLocaleString()}>
          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
        </span>
      )
    },
    {
      key: "last_used",
      header: "Last Used",
      sortable: true,
      cell: (r) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {r.last_used ? formatDistanceToNow(new Date(r.last_used), { addSuffix: true }) : "—"}
        </span>
      )
    },
    {
      key: "note",
      header: "Note",
      cell: (r) => (
        <div className="text-muted-foreground truncate max-w-[150px]" title={r.note}>
          {r.note || "—"}
        </div>
      )
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              let baseUrl = getStorage(STORAGE_KEYS.API_BASE_URL) || "http://localhost:3000";
              baseUrl = baseUrl.replace(/\/api\/?$/, "");
              window.location.href = `${baseUrl}/api/download-plugin/${r.key}`;
            }}
            className="p-1 rounded hover:bg-background border border-transparent hover:border-border text-[var(--accent)] hover:text-[var(--accent)] transition-all"
            title="Download Plugin ZIP"
          >
            <Download className="w-4 h-4" />
          </button>
          <Link
            to={`/logs?key=${r.key}`}
            className="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all"
            title="View Logs"
          >
            <Activity className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setUpdateBudgetKey(r)}
            className="p-1 rounded hover:bg-background border border-transparent hover:border-border text-muted-foreground hover:text-foreground transition-all"
            title="Update Budget"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  const activeColumns = columnsDef.filter(c => c.key === "select" || visibleCols.find(vc => vc.key === c.key)?.visible);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <div className="flex items-center gap-3">
          <Button onClick={() => setGenerateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Generate Key
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Input
          placeholder="Search username, key, or note..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm w-64 bg-card"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-28 text-xs bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={budgetFilter} onValueChange={setBudgetFilter}>
          <SelectTrigger className="h-8 w-36 text-xs bg-card"><SelectValue placeholder="Budget Health" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Budgets</SelectItem>
            <SelectItem value="healthy">Healthy (≥70%)</SelectItem>
            <SelectItem value="warning">Low (30–70%)</SelectItem>
            <SelectItem value="critical">Critical (&lt;30%)</SelectItem>
            <SelectItem value="empty">Exhausted (0 cr)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={usageFilter} onValueChange={setUsageFilter}>
          <SelectTrigger className="h-8 w-32 text-xs bg-card"><SelectValue placeholder="Usage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Usage</SelectItem>
            <SelectItem value="used">Ever Used</SelectItem>
            <SelectItem value="unused">Never Used</SelectItem>
            <SelectItem value="recent">Used Today</SelectItem>
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-[var(--accent)] hover:underline">
            Clear ({activeFilterCount})
          </button>
        )}

        <div className="flex-1" />
        <ColumnToggle columns={visibleCols} onChange={toggleCol} />
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1 bg-card" onClick={exportAll}>
          <Download size={12} />
          Export CSV
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-sm">
          <span className="text-xs text-[var(--text-secondary)]">{selected.size} selected</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={exportSelected}>
            Export CSV
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-[var(--text-muted)]"
            onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <AdminTable
        isLoading={isLoading}
        isEmpty={filteredKeys.length === 0}
        columns={activeColumns}
        data={filteredKeys}
        defaultSort={{ key: "created", dir: "desc" }}
        sortFn={sortFn}
      />

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
          <div className="p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-md text-[var(--success)] flex flex-col items-center justify-center text-center space-y-3">
            <div className="font-semibold">Key Generated Successfully</div>
            <div className="bg-background border border-[var(--success)]/30 px-4 py-2 rounded font-mono text-sm">
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
            <label className="text-sm font-medium mb-1.5 block">Budget (Credits)</label>
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
              <div className="flex justify-between"><span className="text-muted-foreground">Current Remaining:</span> <span className="font-mono font-medium">{apiKey.remaining_budget} s ({(apiKey.remaining_budget / 60).toFixed(2)} min.)</span></div>
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

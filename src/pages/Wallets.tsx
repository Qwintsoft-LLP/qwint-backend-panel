import { useState, useMemo } from "react"
import { useWalletBalances, useTopup, useUserTransactions, UserBalance } from "@/hooks/useWallets"
import AdminTable, { Column } from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"
import { StatsBar } from "@/components/shared/StatsBar"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

import { formatDistanceToNow, format } from "date-fns"
import { Plus, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

const SEGMENTS = [
  { key: "all",      label: "All Users" },
  { key: "active",   label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "rich",     label: "High Balance (>500 cr)" },
  { key: "empty",    label: "Zero Balance" },
];

export default function Wallets() {
  const { data: balances = [], isLoading } = useWalletBalances()
  const [search, setSearch] = useState("")
  const [segment, setSegment] = useState("all")
  const [topupUser, setTopupUser] = useState<string | null>(null)
  const [drawerUser, setDrawerUser] = useState<UserBalance | null>(null)

  const filteredBalances = useMemo(() => {
    return balances.filter(b => {
      if (search && !b.user_id.toLowerCase().includes(search.toLowerCase()) && !(b.mobile && b.mobile.includes(search))) {
        return false;
      }
      if (segment === "active") return b.is_active;
      if (segment === "inactive") return !b.is_active;
      if (segment === "rich") return b.balance_credits > 500;
      if (segment === "empty") return b.balance_credits === 0;
      return true;
    });
  }, [balances, search, segment]);

  const segmentCount = (key: string) => {
    if (key === "active") return balances.filter(b => b.is_active).length;
    if (key === "inactive") return balances.filter(b => !b.is_active).length;
    if (key === "rich") return balances.filter(b => b.balance_credits > 500).length;
    if (key === "empty") return balances.filter(b => b.balance_credits === 0).length;
    return balances.length;
  }

  const walletSortFn = (key: string, dir: "asc" | "desc") => (a: UserBalance, b: UserBalance) => {
    const mul = dir === "asc" ? 1 : -1;
    switch (key) {
      case "user":             return mul * (a.name || "").localeCompare(b.name || "");
      case "balance_credits":  return mul * (a.balance_credits - b.balance_credits);
      case "joined":           return mul * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default: return 0;
    }
  };

  const walletColumns: Column<UserBalance>[] = [
    {
      key: "user",
      header: "User",
      sortable: true,
      cell: r => (
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {r.name || <span className="text-[var(--text-muted)] font-normal">Unnamed</span>}
          </p>
          <span className="text-[10px] text-[var(--text-muted)] block mt-0.5"><CopyField value={r.user_id} /></span>
        </div>
      )
    },
    {
      key: "mobile",
      header: "Mobile",
      cell: r => r.mobile ? <CopyField value={r.mobile} masked /> : <span>—</span>
    },
    {
      key: "balance_credits",
      header: "Credits",
      align: "right",
      sortable: true,
      cell: r => (
        <span className={cn(
          "font-mono text-sm font-semibold",
          r.balance_credits === 0    ? "text-[var(--text-muted)]"  :
          r.balance_credits > 500    ? "text-[var(--success)]"     :
          r.balance_credits < 50     ? "text-[var(--warning)]"     :
          "text-[var(--text-primary)]"
        )}>
          {r.balance_credits.toLocaleString()}
        </span>
      )
    },
    {
      key: "status",
      header: "Status",
      cell: r => (
        <StatusBadge variant={r.is_active ? "success" : "error"}>
          {r.is_active ? "Active" : "Inactive"}
        </StatusBadge>
      )
    },
    {
      key: "joined",
      header: "Joined",
      sortable: true,
      cell: r => (
        <span className="text-xs text-[var(--text-secondary)]" title={new Date(r.created_at).toLocaleString()}>
          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
        </span>
      )
    },
    {
      key: "actions",
      header: "",
      width: "80px",
      align: "right",
      cell: r => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setTopupUser(r.user_id); }}
          >
            Top-up
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDrawerUser(r); }}
          >
            <ChevronRight size={13} />
          </Button>
        </div>
      )
    },
  ];

  const totalCredits    = balances.reduce((s, b) => s + Number(b.balance_credits || 0), 0);
  const zeroBalance     = balances.filter(b => b.balance_credits === 0).length;
  const highBalance     = balances.filter(b => b.balance_credits > 500).length;
  const inactiveUsers   = balances.filter(b => !b.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Wallets</h1>
        <div className="flex items-center gap-3">
          <Button onClick={() => setTopupUser("")} className="gap-2">
            <Plus className="w-4 h-4" />
            Manual Top-up
          </Button>
        </div>
      </div>

      <StatsBar stats={[
        { label: "Total Users",     value: balances.length },
        { label: "Total Credits",   value: totalCredits.toLocaleString() },
        { label: "Zero Balance",    value: zeroBalance },
        { label: "High Balance",    value: highBalance },
        { label: "Inactive",        value: inactiveUsers },
      ]} />

      <div className="flex items-center gap-0 border-b border-[var(--border)] mb-4 overflow-x-auto">
        {SEGMENTS.map(s => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={cn(
              "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              segment === s.key
                ? "border-[var(--accent)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            {s.label}
            <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">
              ({segmentCount(s.key)})
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
        <input 
          type="text" 
          placeholder="Search user ID or mobile..."
          className="w-full sm:max-w-xs h-9 px-3 text-sm bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <AdminTable 
        isLoading={isLoading}
        isEmpty={filteredBalances.length === 0}
        columns={walletColumns}
        data={filteredBalances}
        defaultSort={{ key: "joined", dir: "desc" }}
        sortFn={walletSortFn}
      />

      <TopupModal 
        userId={topupUser} 
        open={topupUser !== null} 
        onClose={() => setTopupUser(null)} 
      />

      <UserDetailDrawer
        user={drawerUser}
        onClose={() => setDrawerUser(null)}
      />
    </div>
  )
}

function UserDetailDrawer({ user, onClose }: { user: UserBalance | null; onClose: () => void }) {
  const { data: txns = [], isLoading: txLoading } = useUserTransactions(user?.user_id || "");
  const [quickTopupAmount, setQuickTopupAmount] = useState("");
  const [quickTopupNote, setQuickTopupNote] = useState("");
  const topup = useTopup();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleQuickTopup = async () => {
    if (!user) return;
    if (!quickTopupAmount || Number(quickTopupAmount) <= 0) return alert("Amount must be positive");
    if (!quickTopupNote) return alert("Note is required");

    try {
      await topup.mutateAsync({
        user_id: user.user_id,
        credits: Number(quickTopupAmount),
        note: quickTopupNote
      });
      toast({ title: "Top-up successful", description: `Added ${quickTopupAmount} credits to wallet` });
      setQuickTopupAmount("");
      setQuickTopupNote("");
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Sheet open={!!user} onOpenChange={v => !v && onClose()}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] bg-[var(--bg-surface)] p-0 flex flex-col border-l border-[var(--sidebar-border)] shadow-xl">
        {/* Header */}
        <div className="px-4 py-4 border-b border-[var(--border)] flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{user?.name || "Unnamed User"}</p>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{user?.user_id}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold font-mono text-[var(--text-primary)]">{user?.balance_credits.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">credits</p>
          </div>
        </div>
        
        {/* Quick top-up inline */}
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2 bg-[var(--bg-elevated)]">
          <Input
            type="number"
            placeholder="Credits to add..."
            value={quickTopupAmount}
            onChange={e => setQuickTopupAmount(e.target.value)}
            className="h-8 text-sm w-36 bg-[var(--input-bg)]"
          />
          <Input
            placeholder="Reason..."
            value={quickTopupNote}
            onChange={e => setQuickTopupNote(e.target.value)}
            className="h-8 text-sm flex-1 bg-[var(--input-bg)]"
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleQuickTopup} disabled={topup.isPending}>
            Add
          </Button>
        </div>
        
        {/* Transaction history */}
        <div className="flex-1 overflow-y-auto">
          {txLoading
            ? <div className="p-4 space-y-2">{Array.from({length: 6}).map((_, i) => (
                <div key={i} className="h-10 bg-[var(--bg-elevated)] rounded animate-pulse" />
              ))}</div>
            : txns.length === 0
            ? <p className="text-center text-xs text-[var(--text-muted)] py-8">No transactions found.</p>
            : txns.map(tx => (
                <div key={tx.id} className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border)]/50 hover:bg-[var(--bg-hover)] transition-colors">
                  <div className="mt-0.5">
                    <StatusBadge variant={tx.type === "CREDIT" ? "success" : "error"}>{tx.type}</StatusBadge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-primary)] truncate" title={tx.description}>{tx.description || "—"}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}</p>
                  </div>
                  <span className={cn(
                    "text-sm font-mono font-medium shrink-0",
                    tx.type === "CREDIT" ? "text-[var(--success)]" : "text-[var(--error)]"
                  )}>
                    {tx.type === "CREDIT" ? "+" : "−"}{Math.abs(tx.amount).toLocaleString()}
                  </span>
                </div>
              ))
          }
        </div>
        
        {/* Footer link */}
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-base)]">
          <Button variant="outline" size="sm" className="text-xs w-full bg-[var(--card-bg)]"
            onClick={() => navigate(`/wallets/${user?.user_id}`)}>
            View Full History →
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
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
      <div className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Manual Wallet Top-up</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-[var(--text-primary)]">User ID *</label>
              <input 
                required 
                type="text" 
                value={userId || selectedUserId} 
                onChange={e => setSelectedUserId(e.target.value)} 
                disabled={!!userId}
                className="w-full h-9 px-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-sm disabled:opacity-50 text-[var(--text-primary)]" 
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block text-[var(--text-primary)]">Credits *</label>
              <input required type="number" min="1" step="1" value={credits} onChange={e => setCredits(e.target.value)} className="w-full h-9 px-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-sm text-[var(--text-primary)]" />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1.5 block text-[var(--text-primary)]">Note *</label>
              <input required type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full h-9 px-3 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md text-sm text-[var(--text-primary)]" placeholder="Reason for top-up" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[var(--bg-elevated)] border-t border-[var(--border)] rounded-b-lg">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md border border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)]">Cancel</button>
            <button disabled={topup.isPending} type="submit" className="px-4 py-2 text-sm font-medium bg-[var(--accent)] text-white rounded-md hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
              {topup.isPending ? "Adding..." : "Add Credits"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

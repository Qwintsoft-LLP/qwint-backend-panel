import { useState, useMemo } from "react"
import { useOrders } from "@/hooks/useProducts"
import AdminTable, { Column } from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"
import SlideOver from "@/components/shared/SlideOver"
import { formatDistanceToNow } from "date-fns"
import { Gift, Info, Download } from "lucide-react"
import { exportToCsv } from "@/lib/export"
import { cn } from "@/lib/utils"

export default function Orders() {
  const { data: orders = [], isLoading } = useOrders()
  const [issueKeyOpen, setIssueKeyOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  
  // Filters
  const [filterApp, setFilterApp] = useState<"ALL" | "CAPTION" | "TALK">("ALL")
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PAID" | "PENDING" | "FAILED">("ALL")

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      let appMatch = true;
      if (filterApp === "CAPTION") appMatch = o.source.includes('caption');
      if (filterApp === "TALK") appMatch = o.source.includes('talk');
      
      let statusMatch = true;
      if (filterStatus === "PAID") statusMatch = (o.status === "PAID" || o.status === "SUCCESS");
      if (filterStatus === "PENDING") statusMatch = (o.status === "PENDING");
      if (filterStatus === "FAILED") statusMatch = (o.status === "FAILED");
      
      return appMatch && statusMatch;
    });
  }, [orders, filterApp, filterStatus]);

  const orderStats = useMemo(() => ({
    total:       orders.length,
    paid:        orders.filter(o => o.status === "PAID" || o.status === "SUCCESS").length,
    pending:     orders.filter(o => o.status === "PENDING").length,
    failed:      orders.filter(o => o.status === "FAILED").length,
    totalRevenue: orders.filter(o => o.status === "PAID" || o.status === "SUCCESS")
                         .reduce((s, o) => s + Number(o.amount || 0), 0),
  }), [orders]);

  const exportOrders = () => {
    exportToCsv(`orders-${Date.now()}.csv`, filteredOrders.map(o => ({
      order_id: o.razorpay_order_id,
      app: o.source,
      type: o.type,
      customer_name: o.customer_name,
      customer_email: o.customer_email,
      customer_mobile: o.customer_mobile,
      product: o.product_id,
      amount: o.amount,
      currency: o.currency,
      credits: o.credits_raw || o.credits_minutes,
      status: o.status,
      payment_id: o.razorpay_payment_id,
      created_at: o.created_at
    })));
  };

  const STATUS_TABS = [
    { key: "ALL", label: "All Orders" },
    { key: "PAID", label: "Paid" },
    { key: "PENDING", label: "Pending" },
    { key: "FAILED", label: "Failed" },
  ];

  const columns: Column<any>[] = [
    {
      key: "id",
      header: "Order ID / Ref",
      cell: o => o.razorpay_order_id ? <CopyField value={o.razorpay_order_id} truncate={12} /> : "—"
    },
    {
      key: "app",
      header: "App / Type",
      cell: o => (
        <>
          <div className="font-medium text-xs bg-muted text-muted-foreground w-fit px-2 py-0.5 rounded uppercase tracking-wider mb-1">
            {o.source.replace(/_/g, ' ')}
          </div>
          <div className={`text-xs font-semibold ${o.type === 'CREDIT' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            {o.type}
          </div>
        </>
      )
    },
    {
      key: "customer",
      header: "Customer",
      cell: o => (
        <>
          <div className="font-medium text-sm">{o.customer_name}</div>
          {o.customer_email && <div className="text-xs text-muted-foreground">{o.customer_email}</div>}
          {o.customer_mobile && o.customer_mobile !== "Unknown" && <div className="text-xs text-muted-foreground">{o.customer_mobile}</div>}
          {o.customer_state && <div className="text-xs text-muted-foreground">{o.customer_state}</div>}
        </>
      )
    },
    {
      key: "product",
      header: "Product / Info",
      cell: o => (
        <div className="max-w-[200px]">
          <div className="font-medium text-sm truncate" title={o.product_id}>{o.product_id}</div>
          <div className="text-xs text-muted-foreground truncate" title={o.description}>{o.description}</div>
          {o.api_key && <div className="text-xs font-mono text-muted-foreground mt-1 truncate" title={o.api_key}>Key: {o.api_key.substring(0,8)}...</div>}
        </div>
      )
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      cell: o => (
        <>
      {Number(o.amount || 0) > 0 && <div className="font-mono text-sm">${Number(o.amount || 0).toFixed(2)} {o.currency}</div>}
          {o.credits_raw > 0 && <div className="text-xs font-mono text-muted-foreground mt-0.5">{o.credits_raw} {o.credits_unit}</div>}
        </>
      )
    },
    {
      key: "credits_raw",
      header: "Credits",
      align: "right",
      cell: o => <span className="font-mono text-xs">{o.credits_raw ?? 0} cr</span>
    },
    {
      key: "status",
      header: "Status",
      cell: o => (
        <StatusBadge variant={o.status === "PAID" || o.status === "SUCCESS" ? "success" : o.status === "FAILED" ? "error" : "warning"}>
          {o.status}
        </StatusBadge>
      )
    },
    {
      key: "payment_id",
      header: "Payment ID",
      cell: o => <span className="font-mono text-muted-foreground text-xs">{o.razorpay_payment_id ? <CopyField value={o.razorpay_payment_id} truncate={12} /> : "—"}</span>
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      cell: o => (
        <span className="text-muted-foreground whitespace-nowrap text-xs" title={new Date(o.created_at).toLocaleString()}>
          {formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}
        </span>
      )
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      cell: o => (
        <button 
          className="p-1 rounded text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors" 
          title="View Details"
          onClick={() => setSelectedOrder(o)}
        >
          <Info className="w-4 h-4" />
        </button>
      )
    }
  ];

  const sortFn = (key: string, dir: "asc" | "desc") => (a: any, b: any) => {
    const mul = dir === "asc" ? 1 : -1;
    switch (key) {
      case "amount":     return mul * ((a.amount || 0) - (b.amount || 0));
      case "created_at": return mul * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default: return 0;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <div className="flex items-center gap-3">
          <select 
            value={filterApp} 
            onChange={e => setFilterApp(e.target.value as "ALL" | "CAPTION" | "TALK")}
            className="h-9 px-3 py-1.5 text-sm font-medium border border-[var(--border)] bg-[var(--input-bg)] rounded-md hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="ALL">All Apps</option>
            <option value="CAPTION">Qwint Caption</option>
            <option value="TALK">Qwint Talk</option>
          </select>

          <button 
            onClick={() => setIssueKeyOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-[var(--border)] bg-[var(--card-bg)] rounded-md hover:bg-[var(--bg-hover)] transition-colors h-9"
          >
            <Gift className="w-4 h-4" />
            Issue Free Key
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3 flex-wrap bg-[var(--bg-elevated)] p-3 rounded border border-[var(--border)]">
        <span><strong className="text-[var(--text-primary)]">{orderStats.total}</strong> orders</span>
        <span>·</span>
        <span><strong className="text-[var(--success)]">{orderStats.paid}</strong> paid</span>
        <span>·</span>
        <span><strong className="text-[var(--warning)]">{orderStats.pending}</strong> pending</span>
        <span>·</span>
        <span><strong className="text-[var(--error)]">{orderStats.failed}</strong> failed</span>
        <span>·</span>
        <span>Revenue: <strong className="text-[var(--text-primary)]">${orderStats.totalRevenue.toLocaleString()}</strong></span>
      </div>

      <div className="flex items-center justify-between border-b border-[var(--border)] mb-4 overflow-x-auto">
        <div className="flex items-center gap-0">
          {STATUS_TABS.map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key as any)}
              className={cn(
                "px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                filterStatus === s.key
                  ? "border-[var(--accent)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              )}
            >
              {s.label}
              <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">
                ({s.key === "ALL" ? orderStats.total : s.key === "PAID" ? orderStats.paid : s.key === "PENDING" ? orderStats.pending : orderStats.failed})
              </span>
            </button>
          ))}
        </div>
        
        <button
          onClick={exportOrders}
          className="flex items-center gap-1 h-8 px-3 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors mb-2"
        >
          <Download size={12} />
          Export
        </button>
      </div>

      <AdminTable 
        isLoading={isLoading}
        isEmpty={filteredOrders.length === 0}
        columns={columns}
        data={filteredOrders}
        defaultSort={{ key: "created_at", dir: "desc" }}
        sortFn={sortFn}
      />

      <IssueKeySlideOver open={issueKeyOpen} onClose={() => setIssueKeyOpen(false)} />
      <OrderDetailsSlideOver order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  )
}

function OrderDetailsSlideOver({ order, onClose }: { order: any; onClose: () => void }) {
  if (!order) return null

  return (
    <SlideOver open={!!order} onClose={onClose} title="Order Details">
      <div className="space-y-4 h-full flex flex-col">
        <div className="bg-muted/30 p-4 rounded-md overflow-auto font-mono text-[13px] text-muted-foreground whitespace-pre-wrap flex-1 border border-border/50 shadow-inner">
          {JSON.stringify(order, null, 2)}
        </div>
        <div className="flex justify-end pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            Close
          </button>
        </div>
      </div>
    </SlideOver>
  )
}

function IssueKeySlideOver({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mobile, setMobile] = useState("")
  const [budget, setBudget] = useState("100")
  const [note, setNote] = useState("Promotional - 2026")

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert("Free key issuance functionality goes here")
    onClose()
  }

  return (
    <SlideOver open={open} onClose={onClose} title="Issue Promotional Key">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Mobile / Email *</label>
            <input required type="text" value={mobile} onChange={e => setMobile(e.target.value)} className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Budget ($)</label>
            <input required type="number" min="0" step="1" value={budget} onChange={e => setBudget(e.target.value)} className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Note</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full h-9 px-3 bg-background border border-border rounded-md text-sm" />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Issue Key
          </button>
        </div>
      </form>
    </SlideOver>
  )
}

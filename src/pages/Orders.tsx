import { useState, useMemo, useRef, useEffect } from "react"
import { useOrders } from "@/hooks/useProducts"
import { useApiKeys } from "@/hooks/useApiKeys"
import AdminTable, { Column } from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"
import SlideOver from "@/components/shared/SlideOver"
import { formatDistanceToNow } from "date-fns"
import { Gift, Info, Download, Settings, ChevronDown } from "lucide-react"
import { exportToCsv } from "@/lib/export"
import { cn } from "@/lib/utils"
import { getStorage, STORAGE_KEYS } from "@/lib/storage"

export default function Orders() {
  const { data: orders = [], isLoading: isOrdersLoading } = useOrders()
  const { data: apiKeys = [], isLoading: isKeysLoading } = useApiKeys()
  const isLoading = isOrdersLoading || isKeysLoading;
  
  const [issueKeyOpen, setIssueKeyOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  
  const [filterProduct, setFilterProduct] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false)
  const colSelectorRef = useRef<HTMLDivElement>(null)
  
  const DEFAULT_COLUMNS = ["id", "customer", "product", "amount", "credits_minutes", "status", "payment_id", "api_key", "created_at", "actions"]
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colSelectorRef.current && !colSelectorRef.current.contains(e.target as Node)) {
        setIsColumnSelectorOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const uniqueProducts = useMemo(() => {
    const products = new Set(orders.map(o => o.product_id).filter(Boolean));
    return Array.from(products).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      let productMatch = true;
      if (filterProduct !== "ALL") productMatch = o.product_id === filterProduct;
      
      let statusMatch = true;
      if (filterStatus === "PAID") statusMatch = (o.status === "PAID" || o.status === "SUCCESS");
      if (filterStatus === "PENDING") statusMatch = (o.status === "PENDING");
      if (filterStatus === "FAILED") statusMatch = (o.status === "FAILED");

      let searchMatch = true;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        searchMatch = 
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_email?.toLowerCase().includes(q) ||
          o.razorpay_order_id?.toLowerCase().includes(q) ||
          o.razorpay_payment_id?.toLowerCase().includes(q) ||
          o.customer_mobile?.includes(q);
      }
      
      return productMatch && statusMatch && searchMatch;
    });
  }, [orders, filterProduct, filterStatus, searchQuery]);

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
      order_id: o.razorpay_order_id || o.id,
      customer_name: o.customer_name,
      customer_email: o.customer_email,
      customer_mobile: o.customer_mobile,
      customer_state: o.customer_state,
      product: o.product_id,
      amount: o.amount,
      currency: o.currency,
      credits_minutes: o.credits_minutes,
      status: o.status,
      payment_id: o.razorpay_payment_id,
      api_key: o.api_key,
      created_at: o.created_at,
      updated_at: o.updated_at
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
      cell: o => o.razorpay_order_id ? <CopyField value={o.razorpay_order_id} truncate={12} /> : <span className="font-mono text-[10px] text-muted-foreground">{o.id.substring(0,8)}...</span>
    },
    {
      key: "customer",
      header: "Customer",
      cell: o => (
        <>
          <div className="font-medium text-sm max-w-[150px] truncate" title={o.customer_name}>{o.customer_name || "Guest"}</div>
          {o.customer_email && <div className="text-xs text-muted-foreground max-w-[150px] truncate" title={o.customer_email}>{o.customer_email}</div>}
          {o.customer_mobile && o.customer_mobile !== "0000000000" && <div className="text-xs text-muted-foreground">{o.customer_mobile}</div>}
          {o.customer_state && o.customer_state !== "Unknown" && <div className="text-[10px] uppercase text-muted-foreground tracking-wider mt-0.5">{o.customer_state}</div>}
        </>
      )
    },
    {
      key: "product",
      header: "Product",
      cell: o => (
        <div className="font-medium text-xs bg-muted text-muted-foreground w-fit px-2 py-0.5 rounded uppercase tracking-wider">
          Product {o.product_id}
        </div>
      )
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      cell: o => (
        <div className="font-mono text-sm">{Number(o.amount || 0).toFixed(2)} {o.currency}</div>
      )
    },
    {
      key: "credits_minutes",
      header: "Credits",
      align: "right",
      sortable: true,
      cell: o => <span className="font-mono text-xs text-[var(--success)]">+{o.credits_minutes ?? 0} min</span>
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
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
      key: "api_key",
      header: "API Key",
      cell: o => {
        const matchingKey = apiKeys.find((k: any) => k.order_id && (k.order_id === o.razorpay_order_id || k.order_id === o.id));
        const finalKey = o.api_key || matchingKey?.key;
        return <span className="font-mono text-muted-foreground text-xs">{finalKey ? <CopyField value={finalKey} truncate={12} /> : "—"}</span>
      }
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
      cell: o => {
        const matchingKey = apiKeys.find((k: any) => k.order_id && (k.order_id === o.razorpay_order_id || k.order_id === o.id));
        const finalKey = o.api_key || matchingKey?.key;
        return (
          <div className="flex items-center justify-end gap-1">
            {finalKey && (
              <button 
                className="p-1 rounded text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors" 
                title="Download Plugin ZIP"
                onClick={() => {
                  let baseUrl = getStorage(STORAGE_KEYS.API_BASE_URL) || "http://localhost:3000";
                  baseUrl = baseUrl.replace(/\/api\/?$/, "");
                  window.location.href = `${baseUrl}/api/download-plugin/${finalKey}`;
                }}
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button 
              className="p-1 rounded text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors" 
              title="View Details"
              onClick={() => setSelectedOrder(o)}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        )
      }
    }
  ];

  const visibleColDefs = columns.filter(c => visibleColumns.includes(c.key));
  
  const toggleColumn = (colKey: string) => {
    setVisibleColumns(prev => 
      prev.includes(colKey) ? prev.filter(k => k !== colKey) : [...prev, colKey]
    )
  }

  const sortFn = (key: string, dir: "asc" | "desc") => (a: any, b: any) => {
    const mul = dir === "asc" ? 1 : -1;
    switch (key) {
      case "amount":          return mul * ((a.amount || 0) - (b.amount || 0));
      case "credits_minutes": return mul * ((a.credits_minutes || 0) - (b.credits_minutes || 0));
      case "status":          return mul * ((a.status || "").localeCompare(b.status || ""));
      case "created_at":      return mul * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default: return 0;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="Search name, email, order id..."
            className="h-9 px-3 text-sm border border-[var(--border)] bg-[var(--input-bg)] rounded-md focus:outline-none focus:border-[var(--accent)] transition-colors min-w-[220px]"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          <select 
            value={filterProduct} 
            onChange={e => setFilterProduct(e.target.value)}
            className="h-9 px-3 py-1.5 text-sm font-medium border border-[var(--border)] bg-[var(--input-bg)] rounded-md hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent)] min-w-[120px]"
          >
            <option value="ALL">All Products</option>
            {uniqueProducts.map(p => (
              <option key={p} value={p}>Product {p}</option>
            ))}
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

      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-1 flex-wrap bg-[var(--bg-elevated)] p-3 rounded border border-[var(--border)]">
        <span><strong className="text-[var(--text-primary)]">{orderStats.total}</strong> orders</span>
        <span>·</span>
        <span><strong className="text-[var(--success)]">{orderStats.paid}</strong> paid</span>
        <span>·</span>
        <span><strong className="text-[var(--warning)]">{orderStats.pending}</strong> pending</span>
        <span>·</span>
        <span><strong className="text-[var(--error)]">{orderStats.failed}</strong> failed</span>
        <span>·</span>
        <span>Revenue: <strong className="text-[var(--text-primary)]">{orderStats.totalRevenue.toLocaleString()}</strong></span>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between border-b border-[var(--border)] mb-2 gap-4">
        <div className="flex items-center gap-0 overflow-x-auto pb-1 max-w-full">
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
        
        <div className="flex items-center gap-2 mb-1">
          <div className="relative" ref={colSelectorRef}>
            <button
              onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
              className="flex items-center gap-2 h-8 px-3 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Columns</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            
            {isColumnSelectorOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                {columns.map(col => (
                  <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer px-3 py-1.5 hover:bg-muted">
                    <input 
                      type="checkbox" 
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded bg-background border-border accent-[var(--accent)]"
                    />
                    {col.header}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={exportOrders}
            className="flex items-center gap-1 h-8 px-3 text-xs bg-[var(--input-bg)] border border-[var(--input-border)] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col border border-[var(--border)] rounded-lg bg-[var(--card-bg)] shadow-sm overflow-hidden">
        <AdminTable 
          columns={visibleColDefs} 
          data={filteredOrders} 
          isLoading={isLoading}
          isEmpty={filteredOrders.length === 0}
          className="flex-1 max-h-none border-0 rounded-none shadow-none"
          sortFn={sortFn}
          defaultSort={{ key: "created_at", dir: "desc" }}
        />
      </div>

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
            <label className="text-sm font-medium mb-1.5 block">Budget (Credits)</label>
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

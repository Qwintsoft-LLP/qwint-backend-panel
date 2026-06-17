import { useState } from "react"
import { useOrders } from "@/hooks/useProducts"
import AdminTable from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"
import SlideOver from "@/components/shared/SlideOver"
import { formatDistanceToNow } from "date-fns"
import { Gift, Info } from "lucide-react"

export default function Orders() {
  const { data: orders, isLoading } = useOrders()
  const [issueKeyOpen, setIssueKeyOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [filterApp, setFilterApp] = useState<"ALL" | "CAPTION" | "TALK">("ALL")

  const filteredOrders = orders?.filter(o => {
    if (filterApp === "ALL") return true;
    if (filterApp === "CAPTION" && o.source.includes('caption')) return true;
    if (filterApp === "TALK" && o.source.includes('talk')) return true;
    return false;
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="flex items-center gap-3">
          <select 
            value={filterApp} 
            onChange={e => setFilterApp(e.target.value as "ALL" | "CAPTION" | "TALK")}
            className="h-9 px-3 py-1.5 text-sm font-medium border border-border bg-background rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Apps</option>
            <option value="CAPTION">Qwint Caption</option>
            <option value="TALK">Qwint Talk</option>
          </select>

          <button 
            onClick={() => setIssueKeyOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors h-9"
          >
            <Gift className="w-4 h-4" />
            Issue Free Key
          </button>
        </div>
      </div>

      <AdminTable 
        isLoading={isLoading}
        isEmpty={filteredOrders?.length === 0}
        headers={["Order ID / Ref", "App / Type", "Customer", "Product / Info", "Amount / Credits", "Status", "Payment ID", "Created", "Actions"]}
      >
        {filteredOrders?.map(o => (
          <tr key={o.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
            <td className="px-3 py-2 align-top">
              {o.razorpay_order_id ? <CopyField value={o.razorpay_order_id} truncate={12} /> : "—"}
            </td>
            <td className="px-3 py-2 align-top">
              <div className="font-medium text-xs bg-muted text-muted-foreground w-fit px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                {o.source.replace(/_/g, ' ')}
              </div>
              <div className={`text-xs font-semibold ${o.type === 'CREDIT' ? 'text-success' : 'text-error'}`}>
                {o.type}
              </div>
            </td>
            <td className="px-3 py-2 align-top">
              <div className="font-medium text-sm">{o.customer_name}</div>
              {o.customer_email && <div className="text-xs text-muted-foreground">{o.customer_email}</div>}
              {o.customer_mobile && o.customer_mobile !== "Unknown" && <div className="text-xs text-muted-foreground">{o.customer_mobile}</div>}
              {o.customer_state && <div className="text-xs text-muted-foreground">{o.customer_state}</div>}
            </td>
            <td className="px-3 py-2 align-top max-w-[200px]">
              <div className="font-medium text-sm truncate" title={o.product_id}>{o.product_id}</div>
              <div className="text-xs text-muted-foreground truncate" title={o.description}>{o.description}</div>
              {o.api_key && <div className="text-xs font-mono text-muted-foreground mt-1 truncate" title={o.api_key}>Key: {o.api_key.substring(0,8)}...</div>}
            </td>
            <td className="px-3 py-2 align-top text-right">
              {o.amount > 0 && <div className="font-mono text-sm">${o.amount.toFixed(2)} {o.currency}</div>}
              {o.credits_raw > 0 && <div className="text-xs font-mono text-muted-foreground mt-0.5">{o.credits_raw} {o.credits_unit}</div>}
            </td>
            <td className="px-3 py-2 align-top">
              <StatusBadge variant={o.status === "PAID" || o.status === "SUCCESS" ? "success" : o.status === "FAILED" ? "error" : "warning"}>
                {o.status}
              </StatusBadge>
            </td>
            <td className="px-3 py-2 align-top font-mono text-muted-foreground text-xs">
              {o.razorpay_payment_id ? <CopyField value={o.razorpay_payment_id} truncate={12} /> : "—"}
            </td>
            <td className="px-3 py-2 align-top text-muted-foreground whitespace-nowrap text-xs">
              <div title={new Date(o.created_at).toLocaleString()}>{formatDistanceToNow(new Date(o.created_at), { addSuffix: true })}</div>
            </td>
            <td className="px-3 py-2 align-top text-right">
              <button 
                className="p-1 rounded text-accent hover:bg-accent/10 transition-colors" 
                title="View Details"
                onClick={() => setSelectedOrder(o)}
              >
                <Info className="w-4 h-4" />
              </button>
            </td>
          </tr>
        ))}
      </AdminTable>

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

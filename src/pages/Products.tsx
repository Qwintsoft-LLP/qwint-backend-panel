import { useProducts, Product } from "@/hooks/useProducts"
import AdminTable from "@/components/shared/AdminTable"
import CopyField from "@/components/shared/CopyField"
import { useState } from "react"
import { Check, X, Edit2 } from "lucide-react"

export default function Products() {
  const { data: products, isLoading } = useProducts()
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <AdminTable 
        isLoading={isLoading}
        isEmpty={products?.length === 0}
        headers={["Product ID", "Name/Label", "Amount", "Credits Allocated", "Currency", "Actions"]}
      >
        {products?.map(p => (
          <ProductRow 
            key={p.product_id} 
            product={p} 
            isEditing={editingId === p.product_id}
            onEdit={() => setEditingId(p.product_id)}
            onCancel={() => setEditingId(null)}
          />
        ))}
      </AdminTable>
    </div>
  )
}

function ProductRow({ product, isEditing, onEdit, onCancel }: { product: Product; isEditing: boolean; onEdit: () => void; onCancel: () => void }) {
  const [name, setName] = useState(product.name)
  const [amount, setAmount] = useState(product.amount.toString())
  const [credits, setCredits] = useState(product.credits.toString())

  if (isEditing) {
    return (
      <tr className="border-b border-border bg-muted/30 h-[40px]">
        <td className="px-3"><CopyField value={product.product_id} truncate={8} /></td>
        <td className="px-3"><input className="w-full h-7 px-2 text-sm bg-background border border-border rounded" value={name} onChange={e => setName(e.target.value)} /></td>
        <td className="px-3"><input type="number" className="w-full h-7 px-2 text-sm bg-background border border-border rounded text-right" value={amount} onChange={e => setAmount(e.target.value)} /></td>
        <td className="px-3"><input type="number" className="w-full h-7 px-2 text-sm bg-background border border-border rounded text-right" value={credits} onChange={e => setCredits(e.target.value)} /></td>
        <td className="px-3 text-muted-foreground">{product.currency}</td>
        <td className="px-3 text-right space-x-2 whitespace-nowrap">
          <button className="p-1 rounded text-success hover:bg-success/20 transition-colors" title="Save">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onCancel} className="p-1 rounded text-muted-foreground hover:bg-muted transition-colors" title="Cancel">
            <X className="w-4 h-4" />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border/50 hover:bg-muted/50 transition-colors h-[40px]">
      <td className="px-3"><CopyField value={product.product_id} truncate={8} /></td>
      <td className="px-3 font-medium">{product.name}</td>
      <td className="px-3 text-right font-mono">${product.amount}</td>
      <td className="px-3 text-right font-mono">{product.credits} cr</td>
      <td className="px-3 text-muted-foreground">{product.currency}</td>
      <td className="px-3 text-right">
        <button onClick={onEdit} className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Edit Product">
          <Edit2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

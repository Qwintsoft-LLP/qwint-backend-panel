import { useParams, useNavigate } from "react-router-dom"
import { useUserTransactions } from "@/hooks/useWallets"
import AdminTable from "@/components/shared/AdminTable"
import StatusBadge from "@/components/shared/StatusBadge"
import CopyField from "@/components/shared/CopyField"
import { ArrowLeft } from "lucide-react"

export default function WalletDetail() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { data: transactions, isLoading } = useUserTransactions(userId || "")

  const totalBalance = transactions?.reduce((acc, t) => {
    return t.type === "CREDIT" ? acc + Number(t.amount) : acc - Number(t.amount)
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/wallets")}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-sm font-mono text-muted-foreground font-normal bg-muted px-2 py-0.5 rounded">
            User ID: {userId}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Calculated net balance: <span className="font-mono font-medium text-foreground">{totalBalance?.toFixed(2)} credits</span>
        </p>
      </div>

      <AdminTable 
        isLoading={isLoading}
        isEmpty={transactions?.length === 0}
        headers={["Date", "Type", "Amount", "App", "Status", "Description", "Reference"]}
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
            <td className="px-3">
              {t.reference_id ? <CopyField value={t.reference_id} truncate={8} /> : "—"}
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  )
}

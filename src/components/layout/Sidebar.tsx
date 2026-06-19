import { NavLink } from "react-router-dom"
import { LayoutDashboard, Gauge, Key, Wallet, Package, ShoppingCart, Activity, Settings, BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "OVERVIEW" },
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { name: "Usage", to: "/usage", icon: Gauge },
  { name: "Analytics", to: "/analytics", icon: BarChart2 },
  { label: "MANAGEMENT" },
  { name: "API Keys", to: "/api-keys", icon: Key },
  { name: "Wallets & Users", to: "/wallets", icon: Wallet },
  { label: "BILLING" },
  { name: "Products & Pricing", to: "/payments/products", icon: Package },
  { name: "Orders", to: "/payments/orders", icon: ShoppingCart },
  { label: "SYSTEM" },
  { name: "Logs", to: "/logs", icon: Activity },

  { label: "CONFIG" },
  { name: "Settings", to: "/settings", icon: Settings },
]

export default function Sidebar() {
  return (
    <div className="flex-shrink-0 border-r border-border bg-card flex flex-col h-full overflow-y-auto transition-all duration-200 w-[220px] md:w-16 lg:w-[220px]">
      <div className="h-12 flex items-center px-4 border-b border-border sticky top-0 bg-card z-10 md:justify-center lg:justify-start">
        <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-primary-foreground font-bold text-xs flex-shrink-0">
          Q
        </div>
        <span className="ml-3 font-semibold text-sm truncate md:hidden lg:block">Qwint Admin</span>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1">
        {navItems.map((item, idx) => {
          if (item.label) {
            return (
              <div key={idx} className="px-4 mt-4 mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider md:hidden lg:block">
                {item.label}
              </div>
            )
          }

          if (item.to) {
            const Icon = item.icon!
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-4 py-2 mx-2 text-sm rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground group md:justify-center lg:justify-start md:mx-1 lg:mx-2 md:px-0 lg:px-4",
                    isActive && "bg-muted text-foreground font-medium"
                  )
                }
                title={item.name}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="ml-3 truncate md:hidden lg:block">{item.name}</span>
                {(item as { pill?: string }).pill && (
                  <span className="ml-auto text-[8px] font-bold bg-[var(--accent)]/20 text-[var(--accent)] px-1.5 py-0.5 rounded md:hidden lg:flex">
                    {(item as { pill?: string }).pill}
                  </span>
                )}
              </NavLink>
            )
          }
          return null
        })}
      </nav>
    </div>
  )
}

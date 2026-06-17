import { NavLink } from "react-router-dom"
import { LayoutDashboard, Key, Wallet, Package, ShoppingCart, Activity, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "OVERVIEW" },
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
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
    <div className="w-[220px] flex-shrink-0 border-r border-border bg-card flex flex-col h-full overflow-y-auto max-lg:w-16 transition-all duration-200">
      <div className="h-12 flex items-center px-4 border-b border-border sticky top-0 bg-card z-10 max-lg:justify-center">
        <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-primary-foreground font-bold text-xs flex-shrink-0">
          Q
        </div>
        <span className="ml-3 font-semibold text-sm truncate max-lg:hidden">Qwint Admin</span>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-1">
        {navItems.map((item, idx) => {
          if (item.label) {
            return (
              <div key={idx} className="px-4 mt-4 mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider max-lg:hidden">
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
                    "flex items-center px-4 py-2 mx-2 text-sm rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground group max-lg:justify-center max-lg:mx-1 max-lg:px-0",
                    isActive && "bg-muted text-foreground font-medium border-l-[3px] border-accent rounded-l-none mx-0 pl-[calc(1rem-3px)] max-lg:border-none max-lg:rounded-md max-lg:pl-0 max-lg:mx-1"
                  )
                }
                title={item.name}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="ml-3 truncate max-lg:hidden">{item.name}</span>
              </NavLink>
            )
          }
          return null
        })}
      </nav>
    </div>
  )
}

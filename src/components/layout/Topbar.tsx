
import { useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { getStorage, STORAGE_KEYS, setStorage } from "@/lib/storage"
import { Moon as MoonIcon, Sun as SunIcon, Menu as MenuIcon } from "lucide-react"

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const location = useLocation()
  const [theme, setTheme] = useState(getStorage(STORAGE_KEYS.THEME) || "dark")
  const [keysConfigured, setKeysConfigured] = useState(0)

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    setStorage(STORAGE_KEYS.THEME, theme)
  }, [theme])

  useEffect(() => {
    const mk = getStorage(STORAGE_KEYS.MASTER_KEY)
    const ak = getStorage(STORAGE_KEYS.ADMIN_KEY)
    let c = 0
    if (mk) c++
    if (ak) c++
    setKeysConfigured(c)
  }, [location.pathname])

  const routeName = location.pathname.split('/').filter(Boolean).pop()?.replace('-', ' ') || 'Dashboard'

  return (
    <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-1 rounded-md hover:bg-muted md:hidden text-muted-foreground">
          <MenuIcon className="w-4 h-4" />
        </button>
        <div className="text-sm font-medium capitalize text-muted-foreground">
          {routeName}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
        >
          {theme === 'dark' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2 group cursor-pointer" title="Auth Status (Requires Master & Admin keys in Settings)">
          <div className="text-xs text-muted-foreground max-sm:hidden">Status</div>
          <div className={`w-2.5 h-2.5 rounded-full ${keysConfigured === 2 ? 'bg-success' : keysConfigured === 1 ? 'bg-warning' : 'bg-error'}`} />
        </div>
      </div>
    </header>
  )
}

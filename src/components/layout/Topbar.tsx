
import { useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { getStorage, STORAGE_KEYS, setStorage, getEnvironments, getActiveEnvId, setActiveEnvId, Environment } from "@/lib/storage"
import { Moon as MoonIcon, Sun as SunIcon, Menu as MenuIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function Topbar({ onToggleSidebar, children }: { onToggleSidebar: () => void, children?: React.ReactNode }) {
  const location = useLocation()
  const [theme, setTheme] = useState(getStorage(STORAGE_KEYS.THEME) || "dark")
  const [keysConfigured, setKeysConfigured] = useState(0)
  const [envs, setEnvs] = useState<Environment[]>([])
  const [activeEnvId, setActiveEnvIdState] = useState("")

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

    // Load environments
    try {
      const activeId = getActiveEnvId()
      const list = getEnvironments()
      setEnvs(list)
      setActiveEnvIdState(activeId)
    } catch (err) {
      console.error(err)
    }
  }, [location.pathname])

  const handleSwitch = (id: string) => {
    if (id === activeEnvId) return
    setActiveEnvId(id)
    setActiveEnvIdState(id)
    window.location.reload()
  }

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
        {children}
      </div>

      <div className="flex items-center gap-4">
        {activeEnvId && envs.length > 0 && (
          <Select value={activeEnvId} onValueChange={handleSwitch}>
            <SelectTrigger className="h-7 w-auto min-w-[80px] bg-muted hover:bg-muted/80 text-muted-foreground border border-border rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider focus:ring-0 focus:ring-offset-0 transition-colors gap-1 [&>span]:line-clamp-1 [&>span]:w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="bg-popover text-popover-foreground border border-border">
              {envs.map((env) => (
                <SelectItem key={env.id} value={env.id} className="text-xs uppercase font-semibold">
                  {env.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

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

import { useState } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import { CommandPalette } from "@/components/shared/CommandPalette"

export default function AppShell({ children }: { children: React.ReactNode, routeName?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile drawer or Desktop persistent */}
      <div className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="hidden md:flex items-center gap-1.5 px-2 h-7 rounded border border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--border-focus)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <span>Quick jump</span>
            <kbd className="text-[10px] bg-[var(--bg-elevated)] px-1 rounded">⌘K</kbd>
          </button>
        </Topbar>
        <CommandPalette />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}

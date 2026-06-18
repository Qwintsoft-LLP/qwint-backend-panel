import { useState } from "react"
import { getStorage, setStorage, STORAGE_KEYS } from "@/lib/storage"
import { Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function Settings() {
  const { toast } = useToast()
  const [baseUrl, setBaseUrl] = useState(getStorage(STORAGE_KEYS.API_BASE_URL) || "https://awgw38j7f03qa8i601ykib1r.3.shreylink.in/api")
  const [masterKey, setMasterKey] = useState(getStorage(STORAGE_KEYS.MASTER_KEY) || "ac24dfdb-959d-41cb-babe-af203a962a27")
  const [adminKey, setAdminKey] = useState(getStorage(STORAGE_KEYS.ADMIN_KEY) || "change-me")
  const [jwt, setJwt] = useState(getStorage(STORAGE_KEYS.JWT))

  const handleSave = () => {
    setStorage(STORAGE_KEYS.API_BASE_URL, baseUrl)
    setStorage(STORAGE_KEYS.MASTER_KEY, masterKey)
    setStorage(STORAGE_KEYS.ADMIN_KEY, adminKey)
    setStorage(STORAGE_KEYS.JWT, jwt)
    
    toast({
      title: "Settings saved",
      description: "Configuration has been updated in local storage.",
    })
    
    // Optionally trigger a page reload to reset auth state
    setTimeout(() => window.location.reload(), 500)
  }

  return (
    <div className="max-w-2xl space-y-8">


      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase text-muted-foreground tracking-wider border-b border-border pb-2">
            API Configuration
          </h2>
          
          <div className="grid gap-4">
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <label className="text-sm text-secondary-foreground font-medium">Base URL *</label>
              <input 
                type="text" 
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="flex h-8 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="https://api.qwinttalk.com"
              />
            </div>

            <SecretInput label="Master Key *" value={masterKey} onChange={setMasterKey} />
            <SecretInput label="Admin Key" value={adminKey} onChange={setAdminKey} />
            <SecretInput label="JWT Token" value={jwt} onChange={setJwt} />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            onClick={handleSave}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}

function SecretInput({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  const [show, setShow] = useState(false)
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
      <label className="text-sm text-secondary-foreground font-medium">{label}</label>
      <div className="relative">
        <input 
          type={show ? "text" : "password"} 
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex h-8 w-full rounded-md border border-border bg-background px-3 py-1 pr-10 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
          placeholder="•••••••••••••••••"
        />
        <button 
          className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

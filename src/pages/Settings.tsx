import { useState } from "react"
import { getStorage, setStorage, STORAGE_KEYS, getLangfuseSettings } from "@/lib/storage"
import { Eye, EyeOff, FlaskConical } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

export default function Settings() {
  const { toast } = useToast()
  const [baseUrl, setBaseUrl] = useState(getStorage(STORAGE_KEYS.API_BASE_URL))
  const [masterKey, setMasterKey] = useState(getStorage(STORAGE_KEYS.MASTER_KEY))
  const [adminKey, setAdminKey] = useState(getStorage(STORAGE_KEYS.ADMIN_KEY))
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

        <div className="pt-4 flex justify-end border-t border-border">
          <button
            onClick={handleSave}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            Save Settings
          </button>
        </div>
      </div>

      {/* ── Langfuse Section ──────────────────────────────────────────── */}
      <LangfuseSection />
    </div>
  )
}

function LangfuseSection() {
  const { toast } = useToast()
  const saved = getLangfuseSettings()
  const [lf, setLf] = useState({
    host: saved.host,
    publicKey: saved.publicKey,
    secretKey: saved.secretKey,
  })
  const [showPk, setShowPk] = useState(false)
  const [showSk, setShowSk] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null)

  const saveLangfuse = () => {
    setStorage(STORAGE_KEYS.LANGFUSE_HOST, lf.host)
    setStorage(STORAGE_KEYS.LANGFUSE_PUBLIC_KEY, lf.publicKey)
    setStorage(STORAGE_KEYS.LANGFUSE_SECRET_KEY, lf.secretKey)
    toast({ title: "Langfuse settings saved" })
    setTestResult(null)
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const auth = "Basic " + btoa(`${lf.publicKey}:${lf.secretKey}`)
      const res = await fetch(`${lf.host}/api/public/traces?limit=1`, {
        headers: { Authorization: auth },
      })
      setTestResult(res.ok ? "ok" : "fail")
    } catch {
      setTestResult("fail")
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <h2 className="text-sm font-medium uppercase text-muted-foreground tracking-wider flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-[var(--accent)]" />
        Langfuse Observability
      </h2>
      <div className="grid gap-4">
        <div className="grid grid-cols-[120px_1fr] items-center gap-4">
          <label className="text-sm text-secondary-foreground font-medium">Host</label>
          <input
            type="text"
            value={lf.host}
            onChange={e => setLf(p => ({ ...p, host: e.target.value }))}
            className="flex h-8 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="https://cloud.langfuse.com"
          />
        </div>
        <SecretInputRow
          label="Public Key"
          value={lf.publicKey}
          show={showPk}
          placeholder="pk-lf-..."
          onChange={v => setLf(p => ({ ...p, publicKey: v }))}
          onToggle={() => setShowPk(p => !p)}
        />
        <SecretInputRow
          label="Secret Key"
          value={lf.secretKey}
          show={showSk}
          placeholder="sk-lf-..."
          onChange={v => setLf(p => ({ ...p, secretKey: v }))}
          onToggle={() => setShowSk(p => !p)}
        />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button size="sm" className="h-8 text-xs" onClick={saveLangfuse}>
          Save Langfuse Config
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={testConnection}
          disabled={testing || !lf.publicKey || !lf.secretKey}
        >
          {testing ? "Testing..." : "Test Connection"}
        </Button>
        {testResult === "ok" && <span className="text-xs text-[var(--success)] font-medium">✓ Connected</span>}
        {testResult === "fail" && <span className="text-xs text-[var(--error)] font-medium">✗ Failed — check keys or host</span>}
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
          type="button"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

function SecretInputRow({
  label, value, show, placeholder, onChange, onToggle
}: {
  label: string; value: string; show: boolean; placeholder: string;
  onChange: (v: string) => void; onToggle: () => void
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-4">
      <label className="text-sm text-secondary-foreground font-medium">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex h-8 w-full rounded-md border border-border bg-background px-3 py-1 pr-10 text-sm shadow-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder={placeholder}
        />
        <button
          type="button"
          className="absolute right-2 top-1.5 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}


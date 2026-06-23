import { useState, useEffect } from "react"
import {
  getStorage,
  setStorage,
  STORAGE_KEYS,
  getLangfuseSettings,
  getEnvironments,
  getActiveEnvId,
  setActiveEnvId,
  saveEnvironment,
  addEnvironment,
  deleteEnvironment,
  Environment
} from "@/lib/storage"
import { Eye, EyeOff, FlaskConical, Globe, Server, Laptop, Settings as SettingsIcon, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

export default function Settings() {
  const { toast } = useToast()
  const [envs, setEnvs] = useState<Environment[]>([])
  const [activeEnvId, setActiveEnvIdState] = useState<string>("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEnvName, setNewEnvName] = useState("")

  const [baseUrl, setBaseUrl] = useState(getStorage(STORAGE_KEYS.API_BASE_URL))
  const [masterKey, setMasterKey] = useState(getStorage(STORAGE_KEYS.MASTER_KEY))
  const [adminKey, setAdminKey] = useState(getStorage(STORAGE_KEYS.ADMIN_KEY))
  const [jwt, setJwt] = useState(getStorage(STORAGE_KEYS.JWT))

  useEffect(() => {
    setEnvs(getEnvironments())
    setActiveEnvIdState(getActiveEnvId())
  }, [])

  useEffect(() => {
    setBaseUrl(getStorage(STORAGE_KEYS.API_BASE_URL))
    setMasterKey(getStorage(STORAGE_KEYS.MASTER_KEY))
    setAdminKey(getStorage(STORAGE_KEYS.ADMIN_KEY))
    setJwt(getStorage(STORAGE_KEYS.JWT))
  }, [activeEnvId])

  const handleSwitch = (id: string) => {
    if (id === activeEnvId) return
    setActiveEnvId(id)
    setActiveEnvIdState(id)
    toast({
      title: "Environment Switched",
      description: `Active environment set to ${envs.find(e => e.id === id)?.name || id}.`,
    })
    setTimeout(() => window.location.reload(), 500)
  }

  const handleDelete = (env: Environment) => {
    if (window.confirm(`Are you sure you want to delete the "${env.name}" environment?`)) {
      deleteEnvironment(env.id)
      toast({
        title: "Environment Deleted",
        description: `Successfully removed environment "${env.name}".`,
      })
      setTimeout(() => window.location.reload(), 500)
    }
  }

  const handleAddEnv = () => {
    if (!newEnvName.trim()) return
    const createdName = newEnvName.trim()
    addEnvironment(createdName)
    setShowAddModal(false)
    setNewEnvName("")
    toast({
      title: "Environment Created",
      description: `Created and switched to environment "${createdName}".`,
    })
    setTimeout(() => window.location.reload(), 500)
  }

  const handleSave = () => {
    setStorage(STORAGE_KEYS.API_BASE_URL, baseUrl)
    setStorage(STORAGE_KEYS.MASTER_KEY, masterKey)
    setStorage(STORAGE_KEYS.ADMIN_KEY, adminKey)
    setStorage(STORAGE_KEYS.JWT, jwt)

    // Save to active environment entry in environments array
    const env = envs.find(e => e.id === activeEnvId)
    if (env) {
      saveEnvironment({
        ...env,
        baseUrl,
        masterKey,
        adminKey,
        jwt
      })
    }

    toast({
      title: "Settings saved",
      description: "Configuration has been updated in local storage.",
    })
    setTimeout(() => window.location.reload(), 500)
  }

  const activeEnvName = envs.find(e => e.id === activeEnvId)?.name || "Active"

  return (
    <div className="max-w-2xl space-y-8">
      {/* ── Environment Selector Section ─────────────────────────────── */}
      <div className="space-y-4 border-b border-border pb-6">
        <div>
          <h2 className="text-sm font-medium uppercase text-muted-foreground tracking-wider mb-1">
            Environments
          </h2>
          <p className="text-xs text-muted-foreground">
            Switch environments to instantly swap credentials and target hosts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {envs.map((env) => {
            const isActive = env.id === activeEnvId
            const isDefault = ["production", "staging", "local"].includes(env.id)
            return (
              <div
                key={env.id}
                onClick={() => handleSwitch(env.id)}
                className={`inline-flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full text-xs font-medium border cursor-pointer select-none transition-all group ${
                  isActive
                    ? "bg-primary border-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                    : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {env.id === "production" && <Globe className="w-3.5 h-3.5" />}
                {env.id === "staging" && <Server className="w-3.5 h-3.5" />}
                {env.id === "local" && <Laptop className="w-3.5 h-3.5" />}
                {!isDefault && <SettingsIcon className="w-3.5 h-3.5" />}

                <span>{env.name}</span>

                {!isDefault && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(env)
                    }}
                    className={`ml-1.5 p-0.5 rounded-full transition-colors ${
                      isActive
                        ? "hover:bg-primary-foreground/20 text-primary-foreground/75 hover:text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    title={`Delete ${env.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                )}
              </div>
            )
          })}

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 pl-3 pr-4 py-1.5 rounded-full text-xs font-medium border border-dashed border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground hover:bg-muted/20 transition-all select-none"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Environment
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-sm font-medium uppercase text-muted-foreground tracking-wider border-b border-border pb-2 flex items-center justify-between">
            <span>API Configuration</span>
            <span className="text-xs font-normal text-muted-foreground normal-case bg-muted px-2 py-0.5 rounded">
              Saving to: <strong className="font-semibold text-foreground">{activeEnvName}</strong>
            </span>
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
      <LangfuseSection activeEnvName={activeEnvName} />

      {/* ── Add Environment Dialog Modal ─────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-background border border-border rounded-lg shadow-xl w-full max-w-sm mx-4 p-5 animate-in zoom-in-95 duration-200 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">Add New Environment</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Enter a name. This will duplicate current configuration as a starting point.
              </p>
            </div>

            <input
              type="text"
              placeholder="e.g. UAT, Dev 2"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && newEnvName.trim()) {
                  handleAddEnv()
                }
              }}
            />

            <div className="flex justify-end gap-2.5 pt-1">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={handleAddEnv} disabled={!newEnvName.trim()}>
                Create Environment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LangfuseSection({ activeEnvName }: { activeEnvName: string }) {
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

    // Save to active environment entry in environments array
    const activeId = getActiveEnvId()
    const envs = getEnvironments()
    const env = envs.find(e => e.id === activeId)
    if (env) {
      saveEnvironment({
        ...env,
        lfHost: lf.host,
        lfPublicKey: lf.publicKey,
        lfSecretKey: lf.secretKey
      })
    }

    toast({ title: "Langfuse settings saved" })
    setTestResult(null)
    setTimeout(() => window.location.reload(), 500)
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
      <h2 className="text-sm font-medium uppercase text-muted-foreground tracking-wider flex items-center justify-between">
        <span className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-[var(--accent)]" />
          Langfuse Observability
        </span>
        <span className="text-xs font-normal text-muted-foreground normal-case bg-muted px-2 py-0.5 rounded">
          Saving to: <strong className="font-semibold text-foreground">{activeEnvName}</strong>
        </span>
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


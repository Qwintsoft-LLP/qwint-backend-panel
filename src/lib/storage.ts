export interface Environment {
  id: string
  name: string
  baseUrl: string
  masterKey: string
  adminKey: string
  jwt: string
  lfHost: string
  lfPublicKey: string
  lfSecretKey: string
}

export const STORAGE_KEYS = {
  MASTER_KEY:          "qw_master_key",
  ADMIN_KEY:           "qw_admin_key",
  JWT:                 "qw_jwt",
  API_BASE_URL:        "qw_api_base_url",
  THEME:               "qw_theme",
  LANGFUSE_HOST:       "qw_langfuse_host",
  LANGFUSE_PUBLIC_KEY: "qw_langfuse_public_key",
  LANGFUSE_SECRET_KEY: "qw_langfuse_secret_key",
  ENVIRONMENTS:        "qw_environments",
  ACTIVE_ENVIRONMENT:  "qw_active_environment",
} as const

export function getStorage(key: string): string {
  return localStorage.getItem(key) || ""
}

export function setStorage(key: string, value: string) {
  localStorage.setItem(key, value)
}

export function removeStorage(key: string) {
  localStorage.removeItem(key)
}

// ── Langfuse helpers ────────────────────────────────────────────────────────
export const getLangfuseSettings = () => ({
  host:      getStorage(STORAGE_KEYS.LANGFUSE_HOST)       || "https://cloud.langfuse.com",
  publicKey: getStorage(STORAGE_KEYS.LANGFUSE_PUBLIC_KEY) || "",
  secretKey: getStorage(STORAGE_KEYS.LANGFUSE_SECRET_KEY) || "",
})

export const getLangfuseAuthHeader = (): string => {
  const { publicKey, secretKey } = getLangfuseSettings()
  if (!publicKey || !secretKey) return ""
  return "Basic " + btoa(`${publicKey}:${secretKey}`)
}

// ── Environment helpers ─────────────────────────────────────────────────────
export const DEFAULT_ENVIRONMENTS: Environment[] = [
  { id: "production", name: "Production", baseUrl: "https://api.qwinttalk.com", masterKey: "", adminKey: "", jwt: "", lfHost: "https://cloud.langfuse.com", lfPublicKey: "", lfSecretKey: "" },
  { id: "staging", name: "Staging", baseUrl: "https://staging-api.qwinttalk.com", masterKey: "", adminKey: "", jwt: "", lfHost: "https://cloud.langfuse.com", lfPublicKey: "", lfSecretKey: "" },
  { id: "local", name: "Local", baseUrl: "http://localhost:3000", masterKey: "", adminKey: "", jwt: "", lfHost: "https://cloud.langfuse.com", lfPublicKey: "", lfSecretKey: "" },
]

export function getEnvironments(): Environment[] {
  const data = localStorage.getItem(STORAGE_KEYS.ENVIRONMENTS)
  if (!data) {
    // Migration / Initialization
    const currentBase = getStorage(STORAGE_KEYS.API_BASE_URL)
    let detectedActive = "production"
    if (currentBase.includes("localhost") || currentBase.includes("127.0.0.1") || currentBase.includes(":3000")) {
      detectedActive = "local"
    } else if (currentBase.includes("staging") || currentBase.includes("shreylink") || currentBase.includes("dev")) {
      detectedActive = "staging"
    }

    const envs = DEFAULT_ENVIRONMENTS.map(env => {
      if (env.id === detectedActive) {
        return {
          ...env,
          baseUrl: currentBase || env.baseUrl,
          masterKey: getStorage(STORAGE_KEYS.MASTER_KEY),
          adminKey: getStorage(STORAGE_KEYS.ADMIN_KEY),
          jwt: getStorage(STORAGE_KEYS.JWT),
          lfHost: getStorage(STORAGE_KEYS.LANGFUSE_HOST) || env.lfHost,
          lfPublicKey: getStorage(STORAGE_KEYS.LANGFUSE_PUBLIC_KEY),
          lfSecretKey: getStorage(STORAGE_KEYS.LANGFUSE_SECRET_KEY),
        }
      }
      return env
    })

    localStorage.setItem(STORAGE_KEYS.ENVIRONMENTS, JSON.stringify(envs))
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ENVIRONMENT, detectedActive)
    return envs
  }
  return JSON.parse(data)
}

export function getActiveEnvId(): string {
  let active = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENVIRONMENT)
  if (!active) {
    getEnvironments() // will initialize
    active = localStorage.getItem(STORAGE_KEYS.ACTIVE_ENVIRONMENT) || "production"
  }
  return active
}

export function setActiveEnvId(id: string) {
  const envs = getEnvironments()
  const env = envs.find(e => e.id === id)
  if (env) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ENVIRONMENT, id)
    setStorage(STORAGE_KEYS.API_BASE_URL, env.baseUrl)
    setStorage(STORAGE_KEYS.MASTER_KEY, env.masterKey)
    setStorage(STORAGE_KEYS.ADMIN_KEY, env.adminKey)
    setStorage(STORAGE_KEYS.JWT, env.jwt)
    setStorage(STORAGE_KEYS.LANGFUSE_HOST, env.lfHost)
    setStorage(STORAGE_KEYS.LANGFUSE_PUBLIC_KEY, env.lfPublicKey)
    setStorage(STORAGE_KEYS.LANGFUSE_SECRET_KEY, env.lfSecretKey)
  }
}

export function saveEnvironment(env: Environment) {
  const envs = getEnvironments()
  const idx = envs.findIndex(e => e.id === env.id)
  if (idx !== -1) {
    envs[idx] = env
  } else {
    envs.push(env)
  }
  localStorage.setItem(STORAGE_KEYS.ENVIRONMENTS, JSON.stringify(envs))

  const activeId = getActiveEnvId()
  if (env.id === activeId) {
    setActiveEnvId(env.id) // re-apply active settings
  }
}

export function addEnvironment(name: string): string {
  const activeId = getActiveEnvId()
  const envs = getEnvironments()
  const activeEnv = envs.find(e => e.id === activeId) || DEFAULT_ENVIRONMENTS[0]
  
  const newId = `env_${Date.now()}`
  const newEnv: Environment = {
    ...activeEnv,
    id: newId,
    name,
  }
  
  envs.push(newEnv)
  localStorage.setItem(STORAGE_KEYS.ENVIRONMENTS, JSON.stringify(envs))
  setActiveEnvId(newId)
  return newId
}

export function deleteEnvironment(id: string) {
  let envs = getEnvironments()
  envs = envs.filter(e => e.id !== id)
  localStorage.setItem(STORAGE_KEYS.ENVIRONMENTS, JSON.stringify(envs))

  const activeId = getActiveEnvId()
  if (activeId === id) {
    // Switch to first default environment available
    const nextActive = envs.find(e => ["production", "staging", "local"].includes(e.id)) || envs[0]
    if (nextActive) {
      setActiveEnvId(nextActive.id)
    }
  }
}

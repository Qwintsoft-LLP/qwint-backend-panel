export const STORAGE_KEYS = {
  MASTER_KEY:          "qw_master_key",
  ADMIN_KEY:           "qw_admin_key",
  JWT:                 "qw_jwt",
  API_BASE_URL:        "qw_api_base_url",
  THEME:               "qw_theme",
  LANGFUSE_HOST:       "qw_langfuse_host",
  LANGFUSE_PUBLIC_KEY: "qw_langfuse_public_key",
  LANGFUSE_SECRET_KEY: "qw_langfuse_secret_key",
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

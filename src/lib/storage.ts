export const STORAGE_KEYS = {
  MASTER_KEY: "qw_master_key",
  ADMIN_KEY: "qw_admin_key",
  JWT: "qw_jwt",
  API_BASE_URL: "qw_api_base_url",
  THEME: "qw_theme",
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

import axios from "axios"
import { getStorage, STORAGE_KEYS } from "@/lib/storage"

export const apiClient = axios.create()

apiClient.interceptors.request.use((config) => {
  let baseUrl = getStorage(STORAGE_KEYS.API_BASE_URL) || "http://localhost:3000"
  baseUrl = baseUrl.replace(/\/api\/?$/, "")
  config.baseURL = baseUrl

  const url = config.url || ""

  // Apply keys for admin or wallet routes
  if (url.includes("/admin/") || url.includes("/wallet/")) {
    const masterKey = getStorage(STORAGE_KEYS.MASTER_KEY)
    const adminKey = getStorage(STORAGE_KEYS.ADMIN_KEY)
    const jwt = getStorage(STORAGE_KEYS.JWT)

    if (masterKey) config.headers["x-master-key"] = masterKey
    if (adminKey) config.headers["x-admin-key"] = adminKey
    if (jwt) config.headers["Authorization"] = `Bearer ${jwt}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // We can handle global errors here, but mostly we let components handle it
    return Promise.reject(error)
  }
)

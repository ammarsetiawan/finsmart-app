import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch (err) {
    console.warn('[axios] Gagal ambil session:', err?.message || err)
  }
  return config
})

// Queue refresh sesi tunggal: ketika beberapa request gagal 401 bersamaan
// (mis. Promise.all di halaman), semua menunggu satu refresh yang sama,
// lalu di-retry dengan token baru. Mencegah "Gagal memuat data" palsu.
let refreshPromise = null
let refreshInFlight = false

async function refreshToken() {
  if (refreshPromise) return refreshPromise
  refreshInFlight = true
  refreshPromise = supabase.auth
    .refreshSession()
    .then(({ data }) => data?.session?.access_token ?? null)
    .catch((e) => {
      console.warn('[axios] Gagal refresh sesi:', e?.message || e)
      return null
    })
    .finally(() => {
      refreshPromise = null
      refreshInFlight = false
    })
  return refreshPromise
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // Tidak ada respons → jaringan / backend mati.
    if (!err.response) {
      console.error('[axios] Backend tidak merespons. Pastikan server berjalan (npm run dev:backend).')
      return Promise.reject(err)
    }

    // 401 → token mungkin kadaluarsa / sedang refresh.
    // Segarkan sekali (dibagi antar request) lalu ulangi request asli.
    const isAuthEndpoint = err.config?.url?.includes('/auth')
    if (err.response.status === 401 && !isAuthEndpoint && !err.config?._retried) {
      const token = await refreshToken()
      if (token) {
        const retryConfig = { ...err.config }
        retryConfig.headers = { ...retryConfig.headers, Authorization: `Bearer ${token}` }
        retryConfig._retried = true
        return api.request(retryConfig)
      }
    }

    return Promise.reject(err)
  }
)

export default api

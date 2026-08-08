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

let retry401Started = false

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // Tidak ada respons → jaringan / backend mati.
    if (!err.response) {
      console.error('[axios] Backend tidak merespons. Pastikan server berjalan (npm run dev:backend).')
      return Promise.reject(err)
    }

    // 401 → token mungkin kadaluarsa / sedang refresh.
    // Segarkan sesi sekali lalu ulangi request asli satu kali.
    const isAuthEndpoint = err.config?.url?.includes('/auth')
    if (err.response.status === 401 && !retry401Started && !isAuthEndpoint) {
      retry401Started = true
      try {
        const { data } = await supabase.auth.refreshSession()
        const token = data?.session?.access_token
        if (token) {
          const retryConfig = { ...err.config }
          retryConfig.headers = { ...retryConfig.headers, Authorization: `Bearer ${token}` }
          retryConfig._retried = true
          return api.request(retryConfig)
        }
      } catch (refreshErr) {
        console.warn('[axios] Gagal refresh sesi:', refreshErr?.message || refreshErr)
      } finally {
        retry401Started = false
      }
    }

    return Promise.reject(err)
  }
)

export default api

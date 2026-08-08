'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── Cache session antar navigasi (module scope) ──────────────
// Menghilangkan delay + layar loading saat berpindah halaman.
// Session di-cache sehingga navigasi berikutnya langsung merender
// konten tanpa harus menunggu query ulang ke supabase.
let cachedSessionPromise = null

function getSessionCached() {
  if (!cachedSessionPromise) {
    // Memakai getSession() — supabase sudah meng-cache di localStorage,
    // jadi ini fast-path tanpa blokir render. Refresh token TIDAK dipaksa
    // di sini untuk menghindari rotasi token yang bentrok dengan request
    // API halaman yang baru dimuat (pemicu 401 → halaman gagal load).
    // Axios interceptor sudah menangani refresh token secara otomatis
    // saat satu/lebih request terkena 401.
    cachedSessionPromise = supabase.auth
      .getSession()
      .then(({ data }) => data?.session ?? null)
      .catch(() => null)
  }
  return cachedSessionPromise
}

export function useAuthGuard(redirectTo = '/login') {
  const router = useRouter()
  const [session,    setSession]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [user,       setUser]       = useState(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    let mounted = true
    let unlisten = () => {}

    async function checkSession() {
      const session = await getSessionCached()
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)
      setInitialized(true)
      setLoading(false)

      if (!session) {
        router.replace(redirectTo)
      }
    }

    checkSession()

    // Listen for auth state changes (login / logout in other tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, nextSession) => {
        if (!mounted) return

        setSession(nextSession)
        setUser(nextSession?.user ?? null)

        if (event === 'SIGNED_OUT' || !nextSession) {
          // Reset cache saat logout agar sesi baru dicek ulang.
          cachedSessionPromise = null
          router.replace(redirectTo)
        } else {
          // Perbarui cache dengan sesi terbaru.
          cachedSessionPromise = Promise.resolve(nextSession)
          setInitialized(true)
          setLoading(false)
        }
      }
    )
    unlisten = () => subscription?.unsubscribe()

    return () => {
      mounted = false
      unlisten()
    }
  }, [router, redirectTo])

  return { session, user, loading, initialized }
}

export function ProtectedRoute({ children, redirectTo = '/login' }) {
  const { loading, initialized } = useAuthGuard(redirectTo)

  if (loading || !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-lg animate-pulse">Memuat halaman...</p>
      </div>
    )
  }

  return <>{children}</>
}

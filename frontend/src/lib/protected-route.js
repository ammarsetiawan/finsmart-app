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
    // jadi ini fast-path. Paksa refresh dari refresh token di background.
    cachedSessionPromise = supabase.auth
      .getSession()
      .then(({ data }) => {
        const session = data?.session ?? null
        // Segarkan token di background tanpa memblokir render.
        if (session?.user) {
          supabase.auth.refreshSession()
        }
        return session
      })
      .catch(() => null)
      .finally(() => {
        // Biarkan promise di-cache, hasil tidak berubah untuk sesi yang sama.
      })
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

import { supabase } from '@/lib/supabase'
import { profileService } from '@/services'

// Ambil nama tampilan dari sesi Supabase saat ini.
// Urutan: user_metadata.full_name (Google / signup) -> email prefix -> fallback.
function resolveDisplayName(user) {
  if (!user) return 'Pengguna'
  const meta = user.user_metadata || {}
  const fromGoogle = meta.full_name || meta.name
  if (fromGoogle) return fromGoogle
  if (user.email) return user.email.split('@')[0]
  return 'Pengguna'
}

// Pastikan profil backend sudah ada untuk user yang sedang login.
// Jika belum (404), buat otomatis dengan nama dari metadata Supabase.
// Idempoten — dipanggil berkali-kali aman.
export async function ensureProfile(displayName, monthlyIncome = 0) {
  try {
    const { data } = await profileService.getMe()
    return data?.data ?? null
  } catch (error) {
    // Hanya buat profil jika memang belum ada (404), bukan error lain.
    if (error?.response?.status === 404) {
      // Ambil nama dari sesi bila tidak diberikan secara eksplisit.
      let name = displayName
      if (!name) {
        const { data: { user } } = await supabase.auth.getUser()
        name = resolveDisplayName(user)
      }
      const { data } = await profileService.create({
        full_name: name || 'Pengguna',
        monthly_income: monthlyIncome,
      })
      return data?.data ?? null
    }
    // Error lain (jaringan, 401, 500) — lempar agar dipanggil bisa handle.
    throw error
  }
}

// Bootstrap lengkap untuk user yang baru login (termasuk via Google OAuth).
// Memastikan profil ada sebelum aplikasi dipakai.
export async function bootstrapUser(displayName) {
  try {
    await ensureProfile(displayName, 0)
  } catch (e) {
    console.warn('[bootstrap] Gagal menyiapkan profil:', e?.message || e)
  }
}


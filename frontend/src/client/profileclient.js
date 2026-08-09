'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Wallet, Pencil, Check, X } from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/Navbars';
import { profileService } from '@/services';
import { supabase } from '@/lib/supabase';
import { getAvatarUrl } from '@/lib/bootstrap';

const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({ full_name: '', monthly_income: '' })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      const r = await profileService.getMe()
      setProfile(r.data.data)
      setForm({
        full_name: r.data.data.fullName || '',
        monthly_income: r.data.data.monthlyIncome || '',
      })
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      await profileService.update({
        full_name: form.full_name,
        monthly_income: parseFloat(form.monthly_income) || 0,
      })
      await loadAll()
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e.response?.data?.error || 'Gagal menyimpan')
    }
    setSaving(false)
  }

  function handleCancel() {
    setEditing(false)
    setError(null)
    setForm({
      full_name: profile?.fullName || '',
      monthly_income: profile?.monthlyIncome || '',
    })
  }

const initials = profile?.fullName?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'FS'
  const avatarUrl = getAvatarUrl(user)
  const joinDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-400 animate-pulse">Memuat profil...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="w-full max-w-2xl mx-auto px-6 py-10">

        {/* Avatar + nama */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 mb-5 flex flex-col items-center text-center">
          {avatarUrl ? (
            <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100 mb-4">
              <Image src={avatarUrl} alt={initials} fill sizes="80px" className="object-cover" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center text-white text-2xl font-bold mb-4">
              {initials}
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-800">{profile?.fullName || 'Pengguna'}</h1>
          <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          <p className="text-xs text-gray-300 mt-1">Bergabung {joinDate}</p>
        </div>

        {/* Success banner */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-5 flex items-center gap-2">
            <Check size={15} /> Profil berhasil diperbarui
          </div>
        )}

        {/* Info profil */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-5">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-sm tracking-wide text-gray-700">INFORMASI PROFIL</h2>
            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
              >
                <Pencil size={13} /> Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={handleCancel}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={13} /> Batal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-50 transition-colors"
                >
                  <Check size={13} /> {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {/* Nama lengkap */}
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <User size={15} className="text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 tracking-wide mb-1">NAMA LENGKAP</p>
                {editing ? (
                  <input
                    type="text" value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-800">{profile?.fullName || '—'}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Mail size={15} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 tracking-wide mb-1">EMAIL</p>
                <p className="text-sm font-medium text-gray-800 truncate">{user?.email || '—'}</p>
              </div>
            </div>

            {/* Gaji bulanan */}
            <div className="flex items-center gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                <Wallet size={15} className="text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 tracking-wide mb-1">GAJI BULANAN</p>
                {editing ? (
                  <>
                    <input
                      type="number" min="0" value={form.monthly_income}
                      onChange={e => setForm({ ...form, monthly_income: e.target.value })}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    {form.monthly_income && parseFloat(form.monthly_income) > 0 && (
                      <p className="text-sm font-bold text-gray-800 mt-1.5">
                        {fmt(parseFloat(form.monthly_income))}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-gray-800">
                    {profile?.monthlyIncome && parseFloat(profile.monthlyIncome) > 0
                      ? fmt(parseFloat(profile.monthlyIncome))
                      : <span className="text-gray-400">Belum diset</span>
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="px-6 pb-4">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Zona bahaya */}
        <div className="bg-white border border-red-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-50">
            <h2 className="font-bold text-sm tracking-wide text-red-400">ZONA BAHAYA</h2>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Keluar dari akun</p>
              <p className="text-xs text-gray-400 mt-0.5">Sesi kamu akan berakhir di perangkat ini</p>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login' }}
              className="px-4 py-2 border-2 border-red-400 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
            >
              Keluar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

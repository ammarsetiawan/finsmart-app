'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ChevronUp, ChevronDown, Wallet, Lock, Menu, X,
  LayoutDashboard, ArrowLeftRight, Target, BarChart2, Tag,
  User, LogOut, PlusCircle, Save, RefreshCw,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { dashboardService } from '@/services';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbars';


const SUMMARY_CARDS = [
  { id: 'income', label: 'TOTAL PEMASUKAN', icon: ChevronUp, grad: 'from-teal-400 to-teal-500' },
  { id: 'expense', label: 'TOTAL PENGELUARAN', icon: ChevronDown, grad: 'from-red-500 to-red-600' },
  { id: 'balance', label: 'SALDO', icon: Wallet, grad: 'from-blue-500 to-blue-600' },
]

const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const progressColor = (pct) => {
  if (pct <= 50) return 'bg-emerald-400'
  if (pct <= 80) return 'bg-yellow-400'
  return 'bg-red-500'
}
// ── Sub komponen ───────────────────────────────────────────────
function SummaryCard({ label, icon: Icon, grad, value }) {
  return (
    <div className={`bg-linear-to-br ${grad} rounded-2xl p-6 lg:p-8 text-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer`}>
      <div className="flex justify-center mb-4">
        <div className="border-2 border-white rounded-full p-3"><Icon size={28} /></div>
      </div>
      <h3 className="text-center text-xs font-bold mb-3 tracking-wider">{label}</h3>
      <p className="text-center text-lg font-bold">{fmt(value)}</p>
      <p className="text-center text-xs opacity-75 mt-1">Bulan ini</p>
    </div>
  )
}

function BudgetRow({ item, isSelected, onClick }) {
  const pct = Math.min(Math.round((item.spentAmount / parseFloat(item.limitAmount)) * 100), 100)
  const sisa = parseFloat(item.limitAmount) - item.spentAmount
  return (
    <div onClick={onClick}
      className={`cursor-pointer p-4 rounded-xl transition-all duration-200 ${isSelected ? 'bg-teal-50 border-l-4 border-teal-500' : 'hover:bg-gray-50'
        }`}
    >
      <div className="flex justify-between mb-2">
        <span className={`font-semibold text-sm ${isSelected ? 'text-teal-700' : 'text-gray-800'}`}>
          {item.category?.name || 'Tanpa kategori'}
        </span>
        <span className={`text-sm ${isSelected ? 'text-teal-600 font-semibold' : 'text-gray-500'}`}>
          {fmt(item.spentAmount)} / {fmt(parseFloat(item.limitAmount))}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div className={`h-full ${progressColor(pct)} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-400 mt-1.5 flex justify-between">
        <span>{pct}%</span>
        <span>{sisa > 0 ? `Sisa: ${fmt(sisa)}` : '⚠ Melebihi budget'}</span>
      </div>
    </div>
  )
}

// ── Halaman utama ──────────────────────────────────────────────
export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [loaded,  setLoaded]  = useState(false) // data sudah berhasil dimuat (cegah tampil Rp0 sebelum selesai)
  const [error, setError] = useState(null)
  const [selectedBudget, setSelectedBudget] = useState(null)

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setLoaded(false)
    setError(null)
    try {
      const [s, b] = await Promise.all([
        dashboardService.getSummary(month, year),
        dashboardService.getBudgets(month, year),
      ])
      setSummary(s.data.data)
      setBudgets(b.data.data)
      setLoaded(true)
    } catch (e) {
      setLoaded(false)
      setError('Gagal memuat data. Pastikan backend berjalan.')
    }
    setLoading(false)
  }

  const pieData = (summary?.byCategory || [])
    .filter(c => parseFloat(c.total) > 0)
    .map(c => ({ name: c.categoryName || 'Lainnya', value: parseFloat(c.total), fill: c.color || '#6366f1' }))

  const summaryValues = {
    income: summary?.income || 0,
    expense: summary?.expense || 0,
    balance: summary?.balance || 0,
  }

  if (loading || !loaded) {
    if (error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 mb-3">{error}</p>
            <button onClick={loadAll}
              className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600 transition-colors"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-lg animate-pulse">Memuat dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="w-full px-6 lg:px-10 py-8">

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-16 mb-8">
          {SUMMARY_CARDS.map(card => (
            <SummaryCard key={card.id} {...card} value={summaryValues[card.id]} />
          ))}
        </div>

        {/*
          Layout trick pakai CSS order:
          Desktop (lg): 3 kolom — [pie(1)] [progress(2, span2)] [insight(3 tapi pindah ke bawah pie)]
          Mobile: flex-col dengan order — pie(order-1) progress(order-2) insight(order-3)
        */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">

          {/* Pie Chart — order 1 mobile, kolom 1 desktop */}
          <div className="order-1 lg:col-span-1 border-2 border-teal-500 rounded-2xl p-6 bg-white shadow-sm">
            <h3 className="font-bold text-sm mb-6 tracking-wide">PIE CHART PENGELUARAN PER KATEGORI</h3>
            {pieData.length === 0 ? (
              <p className="text-center text-gray-400 py-16 text-sm">Belum ada pengeluaran bulan ini</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    outerRadius={90} dataKey="value"
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Progress Budget — order 2 mobile, kolom 2-3 desktop */}
          <div className="order-2 lg:col-span-2 lg:row-span-2">
            <div className="border-2 border-teal-500 rounded-2xl p-6 bg-white shadow-sm h-full">
              <h3 className="font-bold text-sm mb-8 tracking-wide">PROGRESS BUDGET</h3>
              {budgets.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-400 text-sm mb-3">Belum ada budget yang diset bulan ini.</p>
                  <Link href="/budgets" className="text-teal-500 text-sm font-medium hover:underline">
                    Set budget sekarang →
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {budgets.map(item => (
                    <BudgetRow key={item.id} item={item}
                      isSelected={selectedBudget === item.id}
                      onClick={() => setSelectedBudget(selectedBudget === item.id ? null : item.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Premium Insight — order 3 mobile, kolom 1 baris 2 desktop */}
          <div className="order-3 lg:col-span-1 border-2 border-teal-500 rounded-2xl bg-white shadow-sm overflow-hidden relative min-h-50">
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-sm bg-black/50 rounded-2xl px-6 text-center gap-3">
              <Lock size={24} className="text-white" />
              <span className="text-white font-bold text-sm tracking-widest">PREMIUM</span>
              <p className="text-white/75 text-xs leading-relaxed max-w-50">
                Insight AI + rekomendasi finansial dari buku-buku terbaik
              </p>
              <button disabled className="bg-teal-500 text-white px-5 py-1.5 rounded-full text-xs font-bold opacity-60 cursor-not-allowed">
                Segera Hadir
              </button>
            </div>
            <div className="p-5 select-none pointer-events-none">
              <h3 className="font-bold text-sm mb-3 tracking-wide">INSIGHT</h3>
              <div className="space-y-2 text-xs text-gray-200">
                {['Pengeluaran keluarga naik 20% vs bulan lalu', 'Hemat transportasi bulan ini', 'Tips: alokasikan 20% untuk tabungan', 'Referensi: Rich Dad Poor Dad — Bab 3'].map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-teal-200 font-bold">•</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        

      </div>
    </div>
  )
}
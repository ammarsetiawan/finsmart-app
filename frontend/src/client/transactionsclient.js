'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, X, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbars';
import { transactionService, categoryService } from '@/services';

const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const ALLOCATION_BADGE = {
  pribadi: 'bg-indigo-100 text-indigo-700',
  keluarga: 'bg-pink-100 text-pink-700',
  tabungan: 'bg-green-100 text-green-700',
}

const EMPTY_FORM = {
  type: 'expense', allocation_type: 'pribadi',
  amount: '', category_id: '', context_note: '',
  transaction_date: new Date().toISOString().split('T')[0],
}

// ── Modal Tambah Transaksi ─────────────────────────────────────
function TransactionModal({ open, onClose, onSave, categories }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setError(null) }
  }, [open])

  // Tutup kalau klik overlay
  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose()
  }

  // Tutup dengan Escape
  useEffect(() => {
    function h(e) { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Nominal harus lebih dari 0'); return }
    setSaving(true)
    setError(null)
    try {
      await transactionService.create({ ...form, amount: parseFloat(form.amount) })
      onSave()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menyimpan transaksi')
    }
    setSaving(false)
  }

  const filteredCategories = categories.filter(c => c.allocationType === form.allocation_type)

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-base tracking-wide">TAMBAH TRANSAKSI</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

          {/* Tipe & Alokasi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">TIPE</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">ALOKASI</label>
              <select
                value={form.allocation_type}
                onChange={e => setForm({ ...form, allocation_type: e.target.value, category_id: '' })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="pribadi">Pribadi</option>
                <option value="keluarga">Keluarga</option>
                <option value="tabungan">Tabungan</option>
              </select>
            </div>
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">NOMINAL (RP)</label>
            <input
              type="number" min="1" required
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            {form.amount && parseFloat(form.amount) > 0 && (
              <div className={`mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-sm font-bold border ${
                form.type === 'income'
                  ? 'bg-green-50 text-green-600 border-green-200'
                  : 'bg-red-50 text-red-500 border-red-200'
              }`}>
                <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  {form.type === 'income' ? '▶ Pemasukan' : '▼ Pengeluaran'}
                </span>
                <span className="tabular-nums">{form.type === 'income' ? '+' : '−'}{fmt(parseFloat(form.amount))}</span>
              </div>
            )}
          </div>

          {/* Kategori & Tanggal */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">KATEGORI</label>
              <select
                value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="">Pilih kategori</option>
                {filteredCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">TANGGAL</label>
              <input
                type="date"
                value={form.transaction_date}
                onChange={e => setForm({ ...form, transaction_date: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
          </div>

          {/* Catatan konteks */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 tracking-wide">
              CATATAN KONTEKS <span className="font-normal text-gray-400 normal-case">(opsional)</span>
            </label>
            <input
              type="text"
              value={form.context_note}
              onChange={e => setForm({ ...form, context_note: e.target.value })}
              placeholder="Contoh: Bayar obat Bapak"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Halaman Transaksi ──────────────────────────────────────────
export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Filter & search state
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterAlloc, setFilterAlloc] = useState('')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => { loadAll() }, [filterMonth, filterYear])

  async function loadAll() {
    setLoading(true)
    try {
      const [t, c] = await Promise.all([
        transactionService.getAll({ month: filterMonth, year: filterYear }),
        categoryService.getAll(),
      ])
      setTransactions(t.data.data)
      setCategories(c.data.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Hapus transaksi ini?')) return
    await transactionService.remove(id)
    loadAll()
  }

  // Filter + search client-side
  const filtered = useMemo(() => {
    let data = [...transactions]
    if (filterType) data = data.filter(t => t.type === filterType)
    if (filterAlloc) data = data.filter(t => t.allocationType === filterAlloc)
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(t =>
        t.category?.name?.toLowerCase().includes(q) ||
        t.contextNote?.toLowerCase().includes(q) ||
        t.amount?.toString().includes(q)
      )
    }
    data.sort((a, b) => {
      const diff = new Date(a.transactionDate) - new Date(b.transactionDate)
      return sortDir === 'desc' ? -diff : diff
    })
    return data
  }, [transactions, search, filterType, filterAlloc, sortDir])

  // Bulan options
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="w-full px-6 lg:px-10 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-gray-800">TRANSAKSI</h1>
            <p className="text-sm text-gray-400 mt-0.5">{filtered.length} transaksi ditemukan</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600 transition-colors"
            >
              <Plus size={16} />
              Tambah
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-45">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Cari kategori atau catatan..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* Bulan & Tahun */}
          <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          >
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Tipe */}
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          >
            <option value="">Semua tipe</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>

          {/* Alokasi */}
          <select value={filterAlloc} onChange={e => setFilterAlloc(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
          >
            <option value="">Semua alokasi</option>
            <option value="pribadi">Pribadi</option>
            <option value="keluarga">Keluarga</option>
            <option value="tabungan">Tabungan</option>
          </select>

          {/* Reset filter */}
          {(search || filterType || filterAlloc) && (
            <button onClick={() => { setSearch(''); setFilterType(''); setFilterAlloc('') }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              <X size={14} /> Reset
            </button>
          )}
        </div>

        {/* Tabel */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 tracking-wider">
                    <button
                      onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                      className="flex items-center gap-1 hover:text-teal-600 transition-colors"
                    >
                      TANGGAL
                      {sortDir === 'desc' ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </button>
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 tracking-wider">KATEGORI</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 tracking-wider">TIPE</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 tracking-wider">ALOKASI</th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 tracking-wider">CATATAN</th>
                  <th className="text-right px-5 py-3.5 text-xs font-bold text-gray-500 tracking-wider">NOMINAL</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-16 text-gray-400">Memuat transaksi...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <p className="text-gray-400 mb-2">Tidak ada transaksi ditemukan</p>
                      <button onClick={() => setModalOpen(true)} className="text-teal-500 text-sm font-medium hover:underline">
                        + Tambah transaksi pertama
                      </button>
                    </td>
                  </tr>
                ) : filtered.map((t, i) => (
                  <tr key={t.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
                  >
                    <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">{t.transactionDate}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">
                      {t.category?.name || <span className="text-gray-400 font-normal">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${t.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                        {t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ALLOCATION_BADGE[t.allocationType] || ''}`}>
                        {t.allocationType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-50 truncate">
                      {t.contextNote || <span className="text-gray-300">—</span>}
                    </td>
                    <td className={`px-5 py-3.5 text-right font-bold whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-500'
                      }`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(parseFloat(t.amount))}
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => handleDelete(t.id)}
                        className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer tabel */}
          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="text-xs text-gray-400">{filtered.length} transaksi</span>
              <div className="flex gap-4 text-xs font-semibold">
                <span className="text-green-600">
                  + {fmt(filtered.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0))}
                </span>
                <span className="text-red-500">
                  - {fmt(filtered.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={loadAll}
        categories={categories}
      />
    </div>
  )
}
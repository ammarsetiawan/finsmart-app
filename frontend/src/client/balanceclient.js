'use client';

import { useState, useEffect } from 'react';
import { Wallet, Save, RefreshCw, PlusCircle, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '@/components/Navbars';
import { balanceService, categoryService, transactionService } from '@/services';

const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const PIE_COLORS = ['#14b8a6', '#6366f1', '#ec4899', '#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4'];

export default function BalanceClient() {
  const [income, setIncome] = useState(0);
  const [categories, setCategories] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [b, c, t] = await Promise.all([
        balanceService.get(),
        categoryService.getAll().catch(() => []),
        transactionService.getAll({ type: 'income' }).catch(() => []),
]);
      setIncome(parseFloat(b.data.data.balance));
      setCategories(c.data?.data || []);

      // Grafik pemasukan per kategori
      const rows = t.data?.data || [];
      const catMap = {};
      rows.forEach((r) => {
        const name = r.category?.name || 'Pemasukan';
        const color = r.category?.color || '#14b8a6';
        catMap[name] = catMap[name] || { name, total: 0, fill: color };
        catMap[name].total += parseFloat(r.amount) || 0;
      });
      setPieData(Object.values(catMap).filter((d) => d.total > 0));
    } catch (e) {
      setError('Gagal memuat data. Pastikan backend berjalan.');
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Masukkan nominal yang valid (lebih dari 0).');
      return;
    }
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      await balanceService.topup(parsed, categoryId || null);
      setAmount('');
      setCategoryId('');
      setMsg('Pemasukan berhasil ditambahkan! Lihat di dashboard & grafik.');
      setTimeout(() => setMsg(null), 4000);
      await loadAll();
    } catch (e) {
      setError(e.response?.data?.error || 'Gagal menambah pemasukan.');
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="w-full px-6 lg:px-10 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-gray-800 flex items-center gap-2">
              <Wallet size={22} className="text-teal-500" />
              SALDO
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Tambah pemasukan saldo · akan masuk ke dashboard & grafik</p>
          </div>
          <Link href="/dashboard"
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600 transition-colors self-start sm:self-auto"
          >
            Kembali ke Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
        )}

        {msg && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
            {msg}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg animate-pulse">Memuat...</p>
          </div>
        ) : (
          <div className="max-w-md mx-auto">

            {/* Total pemasukan bulan ini */}
            <div className="bg-gradient-to-br from-teal-400 to-teal-500 rounded-2xl p-6 mb-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={18} className="text-white/80" />
                <p className="text-sm text-white/80">Total Pemasukan Bulan Ini</p>
              </div>
              <p className="text-3xl font-bold">{fmt(income)}</p>
              <p className="text-xs text-white/70 mt-2">Tampil sebagai TOTAL PEMASUKAN di dashboard</p>
            </div>

            {/* Tambah pemasukan */}
            <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <PlusCircle size={18} className="text-teal-500" />
                <h2 className="font-bold text-sm tracking-wide text-gray-700">TAMBAH PEMASUKAN SALDO</h2>
              </div>

              <label className="block text-xs font-bold text-gray-500 mb-1.5 tracking-wide">
                JUMLAH PEMASUKAN (IDR)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 5000000"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent text-lg font-mono"
              />
              {amount && parseFloat(amount) > 0 && (
                <p className="text-sm font-bold text-green-600 mt-1.5 mb-4">
                  {fmt(parseFloat(amount))}
                </p>
              )}

              <label className="block text-xs font-bold text-gray-500 mb-1.5 tracking-wide">
                KATEGORI <span className="font-normal text-gray-400 normal-case">(opsional)</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
              >
                <option value="">Pemasukan (tanpa kategori)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Tambah Pemasukan
                  </>
                )}
              </button>
            </form>

            {/* Grafik pemasukan */}
            <div className="bg-white border-2 border-teal-500 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <PieIcon size={18} className="text-teal-500" />
                <h2 className="font-bold text-sm tracking-wide text-gray-700">PIE CHART PEMASUKAN PER KATEGORI</h2>
              </div>
              {pieData.length === 0 ? (
                <p className="text-center text-gray-400 py-10 text-sm">Belum ada pemasukan bulan ini</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                        outerRadius={90}
                        dataKey="total"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(parseFloat(v))} contentStyle={{ borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-3 justify-center">
                    {pieData.map((d, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill || PIE_COLORS[i % PIE_COLORS.length] }} />
                        {d.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>

            <p className="text-center text-xs text-gray-400 mt-4">
              Pemasukan akan dicatat sebagai transaksi income dan menambah TOTAL PEMASUKAN serta grafik di dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

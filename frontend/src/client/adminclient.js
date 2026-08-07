'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Users, ReceiptText, TrendingUp, TrendingDown, Tag, Target, Lock, RefreshCw, ShieldAlert, User } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import Navbar from '@/components/Navbars';
import { adminService } from '@/services';

const fmt = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const fmtShort = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(Math.round(n));
};

const ALLOC_LABEL = { pribadi: 'Pribadi', keluarga: 'Keluarga', tabungan: 'Tabungan' };
const ALLOC_COLOR = { pribadi: '#6366f1', keluarga: '#ec4899', tabungan: '#22c55e' };

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color.bg}`}>
          <Icon size={17} className={color.text} />
        </div>
        <span className="text-xs font-bold text-gray-400 tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

// ── Halaman Admin / Monitoring ───────────────────────────────
export default function AdminClient() {
  const [status, setStatus] = useState('loading'); // loading | admin | denied | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { checkAccess() }, []);

  async function checkAccess() {
    setStatus('loading');
    try {
      const r = await adminService.getMe();
      const isAdmin = r.data.data?.admin;
      if (!isAdmin) {
        setStatus('denied');
        return;
      }
      await loadData();
    } catch (e) {
      setStatus('error');
      setError(e.response?.data?.error || 'Gagal memeriksa akses admin.');
    }
  }

  async function loadData() {
    setStatus('loading');
    try {
      const r = await adminService.monitor();
      setData(r.data.data);
      setStatus('admin');
    } catch (e) {
      if (e.response?.status === 403) {
        setStatus('denied');
      } else {
        setStatus('error');
        setError(e.response?.data?.error || 'Gagal mengambil data monitoring.');
      }
    }
  }

  // ── Akses ditolak ──
  if (status === 'denied') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Akses Ditolak</h1>
          <p className="text-sm text-gray-400">
            Halaman ini hanya dapat diakses oleh admin. Email Anda tidak terdaftar sebagai admin.
          </p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button onClick={checkAccess}
            className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ── Memuat / Data ──
  const d = data;
  const allocPie = (d?.allocBreakdown || []).length
    ? d.allocBreakdown.map(a => ({ name: ALLOC_LABEL[a.allocationType] || a.allocationType, value: a.total, color: ALLOC_COLOR[a.allocationType] || '#888' }))
    : [];

  const trendData = (d?.trend || []).map(t => ({
    name: `${t.month}/${t.year}`,
    Pemasukan: t.income,
    Pengeluaran: t.expense,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="w-full px-6 lg:px-10 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-wide text-gray-800 flex items-center gap-2">
              <ShieldCheck size={22} className="text-teal-500" />
              ADMIN & MONITORING
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Statistik agregat seluruh pengguna Fin Smart</p>
          </div>
          <div className="flex items-center gap-2">
            {d && (
              <span className="text-xs text-gray-400 mr-1">
                Diperbarui: {new Date(d.timestamp).toLocaleTimeString('id-ID')}
              </span>
            )}
            <button onClick={loadData} disabled={status !== 'admin'}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600 disabled:opacity-50 transition-colors">
              <RefreshCw size={15} className={status === 'loading' ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {status === 'loading' ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-400 animate-pulse">Memuat data monitoring...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              <StatCard icon={Users} label="Total Pengguna" value={d.users.total || 0} sub="profiles terdaftar" color={{ bg: 'bg-teal-50', text: 'text-teal-600' }} />
              <StatCard icon={ReceiptText} label="Total Transaksi" value={d.transactions.total || 0} sub="semua waktu" color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }} />
              <StatCard icon={TrendingUp} label="Pemasukan (bln ini)" value={fmt(d.transactions.totalIncomeMonth)} sub="seluruh user" color={{ bg: 'bg-green-50', text: 'text-green-600' }} />
              <StatCard icon={TrendingDown} label="Pengeluaran (bln ini)" value={fmt(d.transactions.totalExpenseMonth)} sub="seluruh user" color={{ bg: 'bg-red-50', text: 'text-red-500' }} />
              <StatCard icon={Tag} label="Kategori" value={d.categories.total || 0} sub="total kategori" color={{ bg: 'bg-cyan-50', text: 'text-cyan-600' }} />
              <StatCard icon={Target} label="Budget" value={d.budgets.total || 0} sub="total budget" color={{ bg: 'bg-amber-50', text: 'text-amber-600' }} />
            </div>

            {/* Chart trend + alokasi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trend */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-sm mb-6 tracking-wide text-gray-700">TREND PEMASUKAN / PENGELUARAN (6 BULAN)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
                    <Tooltip formatter={(v) => [fmt(v), '']} contentStyle={{ borderRadius: 8, border: '1px solid #f0f0f0', fontSize: 12 }} />
                    <Bar dataKey="Pemasukan" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Alokasi pie */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-sm mb-6 tracking-wide text-gray-700">PENGELUARAN PER ALOKASI (BULAN INI)</h3>
                {allocPie.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 text-sm">Belum ada pengeluaran bulan ini</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={allocPie} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" paddingAngle={3} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                        {allocPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Lifetime summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-500 tracking-wide mb-1">TOTAL PEMASUKAN (LIFETIME)</p>
                <p className="text-2xl font-bold text-green-600">{fmt(d.transactions.totalIncomeLifetime)}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-500 tracking-wide mb-1">TOTAL PENGELUARAN (LIFETIME)</p>
                <p className="text-2xl font-bold text-red-500">{fmt(d.transactions.totalExpenseLifetime)}</p>
              </div>
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-gray-500 tracking-wide mb-1">SALDO BERSIH (LIFETIME)</p>
                <p className="text-2xl font-bold text-teal-600">{fmt(d.transactions.totalIncomeLifetime - d.transactions.totalExpenseLifetime)}</p>
              </div>
            </div>

{/* Top users */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <h3 className="font-bold text-sm tracking-wide text-gray-700">TOP PENGGUNA (JUMLAH TRANSAKSI)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">#</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">NAMA</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">USER ID</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">TOTAL TRANSAKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.topUsers?.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-sm">Belum ada data</td></tr>
                    )}
                    {d.topUsers?.map((u, i) => (
                      <tr key={u.userId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-400 font-bold">{i + 1}</td>
                        <td className="px-5 py-3 font-semibold text-gray-800">{u.fullName}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{u.userId}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-700">{u.totalTx}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daftar pengguna terdaftar */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <h3 className="font-bold text-sm tracking-wide text-gray-700">AKUN PENGGUNA TERDAFTAR</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{d.users?.registered || 0} akun</span>
                  <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-semibold">
                    🔒 Password tidak ditampilkan (keamanan)
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">#</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">NAMA</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">EMAIL</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">TANGGAL DAFTAR</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">LOGIN TERAKHIR</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">TRANSAKSI</th>
                      <th className="px-5 py-3 text-xs font-bold text-gray-500 tracking-wider">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d.users?.list || []).length === 0 && (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">Belum ada akun pengguna</td></tr>
                    )}
                    {(d.users?.list || []).map((u, i) => (
                      <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-400 font-bold">{i + 1}</td>
                        <td className="px-5 py-3 font-semibold text-gray-800">{u.fullName}</td>
                        <td className="px-5 py-3 text-gray-600">{u.email || '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('id-ID') : '—'}</td>
                        <td className="px-5 py-3 text-gray-500">{u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString('id-ID') : '—'}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-700">{d.users?.txCountByUser?.[u.id] || 0}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${u.isSuspended ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                            {u.isSuspended ? 'Diblokir' : 'Aktif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Password tersimpan sebagai hash (bcrypt) di Supabase Auth dan tidak dapat ditampilkan — ini standar keamanan yang melindungi akun pengguna.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}


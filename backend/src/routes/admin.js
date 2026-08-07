import { Router } from 'express'
import { eq, and, gte, lte, sql, count, desc } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'
import { db } from '../db/index.js'
import { profiles, transactions, categories, budgets, allocationRules } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

// Supabase admin client — untuk mengambil daftar akun (email, token holder).
let supabaseAdmin = null
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  } catch (e) {
    console.warn('[admin] Supabase admin client init failed:', e.message)
  }
}

const router = Router()
router.use(requireAuth)

// ── Admin check ──────────────────────────────────────────────
// Cek apakah user adalah admin berdasarkan email.
// Admin dict dari env ADMIN_EMAILS (koma sebagai separator).
function isAdmin(user) {
  const adminEmails = (process.env.ADMIN_EMAILS || 'ammarsetiawan970@gmail.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes((user.email || '').toLowerCase())
}

// GET /api/admin/me — cek status admin user saat ini
router.get('/me', (req, res) => {
  const admin = isAdmin(req.user)
  res.json({ data: {
    admin,
    email: req.user.email,
  }})
})

// ── GET /api/admin/monitor — statistik global ───────────────
router.get('/monitor', async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang bisa mengakses.' })
    }

    const now   = new Date()
    const month = now.getMonth() + 1
    const year  = now.getFullYear()

    const { start, end } = (() => {
      const m = String(month).padStart(2, '0')
      const lastDay = new Date(year, month, 0).getDate()
      return { start: `${year}-${m}-01`, end: `${year}-${m}-${lastDay}` }
    })()

    // Hitung total user
    const [userCount] = await db.select({ total: count() }).from(profiles)

    // Hitung total kategori
    const [catCount] = await db.select({ total: count() }).from(categories)

    // Hitung total budget
    const [budgetCount] = await db.select({ total: count() }).from(budgets)

    // Total transaksi
    const [txCount] = await db.select({ total: count() }).from(transactions)

    // Ringkasan income/expense SEMUA user bulan ini
    const allTx = await db.select({
      type: transactions.type,
      total: sql`sum(${transactions.amount})::numeric`,
    })
    .from(transactions)
    .where(and(gte(transactions.transactionDate, start), lte(transactions.transactionDate, end)))
    .groupBy(transactions.type)

    const totalIncomeMonth  = parseFloat(allTx.find(t => t.type === 'income')?.total  || 0)
    const totalExpenseMonth = parseFloat(allTx.find(t => t.type === 'expense')?.total || 0)

    // Ringkasan income/expense SEMUA user (sepanjang masa — untuk stat lifetime)
    const allTxLifetime = await db.select({
      type: transactions.type,
      total: sql`sum(${transactions.amount})::numeric`,
    })
    .from(transactions)
    .groupBy(transactions.type)

    const totalIncomeLifetime  = parseFloat(allTxLifetime.find(t => t.type === 'income')?.total  || 0)
    const totalExpenseLifetime = parseFloat(allTxLifetime.find(t => t.type === 'expense')?.total || 0)

    // Breakdown alokasi bulan ini
    const allocBreakdown = await db.select({
      allocationType: transactions.allocationType,
      total: sql`sum(${transactions.amount})::numeric`,
      count: count(),
    })
    .from(transactions)
    .where(and(eq(transactions.type, 'expense'), gte(transactions.transactionDate, start), lte(transactions.transactionDate, end)))
    .groupBy(transactions.allocationType)

    // Trend 6 bulan terakhir
    const trend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1)
      const m = d.getMonth() + 1
      const y = d.getFullYear()
      const lastD = new Date(y, m, 0).getDate()
      const s = `${y}-${String(m).padStart(2, '0')}-01`
      const e = `${y}-${String(m).padStart(2, '0')}-${lastD}`

      const rows = await db.select({
        type: transactions.type,
        total: sql`sum(${transactions.amount})::numeric`,
      })
      .from(transactions)
      .where(and(gte(transactions.transactionDate, s), lte(transactions.transactionDate, e)))
      .groupBy(transactions.type)

      trend.push({
        month: m,
        year: y,
        income:  parseFloat(rows.find(r => r.type === 'income')?.total  || 0),
        expense: parseFloat(rows.find(r => r.type === 'expense')?.total || 0),
      })
    }

    // Jumlah transaksi per user (top 10)
    const topUsers = await db.select({
      userId: transactions.userId,
      total: count(),
    })
    .from(transactions)
    .groupBy(transactions.userId)
    .orderBy(desc(sql`count(*)`))
    .limit(10)

    // Ambil nama user dari profiles
    const topUsersWithNames = await Promise.all(
      topUsers.map(async u => {
        const p = await db.query.profiles.findFirst({ where: eq(profiles.userId, u.userId) })
        return { userId: u.userId, fullName: p?.fullName || '(tanpa nama)', totalTx: u.total }
      })
    )

    // Ambil SEMUA profil untuk dipetakan ke userId (untuk daftar akun)
    const allProfiles = await db.select().from(profiles)
    const profilesByUser = {}
    allProfiles.forEach(p => { profilesByUser[p.userId] = p })

    // ── Daftar akun pengguna ──
    // Email & tanggal daftar diambil dari Supabase Auth (admin API).
    // Password TIDAK tersedia (hanya hash) — tidak pernah diekspos.
    let registeredUsers = []
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        if (error) throw error
        registeredUsers = (data?.users || []).map(u => ({
          id:    u.id,
          email: u.email || '',
          phone: u.phone || '',
          createdAt: u.created_at || null,
          lastSignInAt: u.last_sign_in_at || null,
          isSuspended: !!u.banned_until,
        }))
      } catch (e) {
        console.warn('[admin/monitor] listUsers gagal:', e.message)
      }
    }

    // Jumlah transaksi per user
    const txByUser = await db.select({
      userId: transactions.userId,
      total: count(),
    })
    .from(transactions)
    .groupBy(transactions.userId)

    const txCountByUser = {}
    txByUser.forEach(t => { txCountByUser[t.userId] = parseInt(t.total) })

    // Gabungkan dengan profil (nama)
    const usersWithProfile = registeredUsers.map(u => {
      const p = profilesByUser[u.id]
      return {
        ...u,
        fullName: p?.fullName || '(belum set profil)',
      }
    })

    res.json({
      data: {
        timestamp: new Date(),
        users: {
          total: parseInt(userCount.total),
          registered: registeredUsers.length,
          list: usersWithProfile,
          txCountByUser,
        },
        categories: {
          total: parseInt(catCount.total),
        },
        budgets: {
          total: parseInt(budgetCount.total),
        },
        transactions: {
          total: parseInt(txCount.total),
          totalIncomeMonth,
          totalExpenseMonth,
          totalIncomeLifetime,
          totalExpenseLifetime,
        },
        allocBreakdown: allocBreakdown.map(a => ({
          allocationType: a.allocationType,
          total: parseFloat(a.total || 0),
          count: parseInt(a.count),
        })),
        trend,
        topUsers: topUsersWithNames,
      }
    })
  } catch (e) {
    console.error('[admin/monitor] ERROR:', e.message, e.stack)
    res.status(500).json({ error: e.message })
  }
})

export default router


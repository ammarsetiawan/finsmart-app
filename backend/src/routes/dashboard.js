import { Router } from 'express'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { transactions, budgets, categories } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const range = (month, year) => {
  const m       = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()  // day 0 bulan berikutnya = hari terakhir bulan ini
  return { start: `${year}-${m}-01`, end: `${year}-${m}-${lastDay}` }
}

// GET /api/dashboard/summary?month=&year=
router.get('/summary', async (req, res) => {
  try {
    console.log('[dashboard/summary] user:', req.user?.id)
    const now   = new Date()
    const month = parseInt(req.query.month) || now.getMonth() + 1
    const year  = parseInt(req.query.year)  || now.getFullYear()
    const { start, end } = range(month, year)
    const uid = req.user.id

    const [totals, byAllocation, byCategory] = await Promise.all([
      // Total income & expense
      db.select({
        type:  transactions.type,
        total: sql`sum(${transactions.amount})::numeric`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, uid), gte(transactions.transactionDate, start), lte(transactions.transactionDate, end)))
      .groupBy(transactions.type),

      // Breakdown per allocation_type (expense only)
      db.select({
        allocationType: transactions.allocationType,
        total: sql`sum(${transactions.amount})::numeric`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, uid), eq(transactions.type, 'expense'), gte(transactions.transactionDate, start), lte(transactions.transactionDate, end)))
      .groupBy(transactions.allocationType),

      // Breakdown per kategori untuk pie chart
      db.select({
        categoryId:   transactions.categoryId,
        categoryName: categories.name,
        color:        categories.color,
        total:        sql`sum(${transactions.amount})::numeric`,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, uid), eq(transactions.type, 'expense'), gte(transactions.transactionDate, start), lte(transactions.transactionDate, end)))
      .groupBy(transactions.categoryId, categories.name, categories.color),
    ])

    const income  = parseFloat(totals.find(t => t.type === 'income')?.total  || 0)
    const expense = parseFloat(totals.find(t => t.type === 'expense')?.total || 0)

    res.json({ data: { month, year, income, expense, balance: income - expense, byAllocation, byCategory } })
  } catch (e) {
    console.error('[dashboard/summary] ERROR:', e.message, e.stack)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/dashboard/insight?month=&year=
router.get('/insight', async (req, res) => {
  try {
    const now   = new Date()
    const month = parseInt(req.query.month) || now.getMonth() + 1
    const year  = parseInt(req.query.year)  || now.getFullYear()
    const prev  = new Date(year, month - 2, 1)
    const uid   = req.user.id

    const getTotals = async (m, y) => {
      const { start, end } = range(m, y)
      return db.select({
        allocationType: transactions.allocationType,
        total: sql`sum(${transactions.amount})::numeric`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, uid), eq(transactions.type, 'expense'), gte(transactions.transactionDate, start), lte(transactions.transactionDate, end)))
      .groupBy(transactions.allocationType)
    }

    const [current, previous] = await Promise.all([
      getTotals(month, year),
      getTotals(prev.getMonth() + 1, prev.getFullYear()),
    ])

    const insights = ['pribadi', 'keluarga', 'tabungan'].map(type => {
      const currVal = parseFloat(current.find(r => r.allocationType === type)?.total || 0)
      const prevVal = parseFloat(previous.find(r => r.allocationType === type)?.total || 0)
      const diff    = prevVal > 0 ? Math.round(((currVal - prevVal) / prevVal) * 100) : null
      const message = diff === null ? null
        : diff > 20  ? `Pengeluaran ${type} naik ${diff}% vs bulan lalu`
        : diff < -20 ? `Pengeluaran ${type} turun ${Math.abs(diff)}% vs bulan lalu`
        : `Pengeluaran ${type} stabil dibanding bulan lalu`
      return { allocationType: type, current: currVal, previous: prevVal, changePercent: diff, message }
    })

    res.json({ data: insights })
  } catch (e) {
    console.error('[dashboard/insight] ERROR:', e.message, e.stack)
    res.status(500).json({ error: e.message })
  }
})

// GET /api/dashboard/budgets?month=&year=
router.get('/budgets', async (req, res) => {
  try {
    console.log('[dashboard/budgets] user:', req.user?.id)
    const now   = new Date()
    const month = parseInt(req.query.month) || now.getMonth() + 1
    const year  = parseInt(req.query.year)  || now.getFullYear()
    const { start, end } = range(month, year)
    const uid = req.user.id

    const [budgetList, spent] = await Promise.all([
      db.query.budgets.findMany({
        where: and(eq(budgets.userId, uid), eq(budgets.periodMonth, month), eq(budgets.periodYear, year)),
        with:  { category: true },
      }),
      db.select({
        categoryId: transactions.categoryId,
        total:      sql`sum(${transactions.amount})::numeric`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, uid), eq(transactions.type, 'expense'), gte(transactions.transactionDate, start), lte(transactions.transactionDate, end)))
      .groupBy(transactions.categoryId),
    ])

    const result = budgetList.map(b => {
      const spentAmount = parseFloat(spent.find(s => s.categoryId === b.categoryId)?.total || 0)
      const limitAmount = parseFloat(b.limitAmount)
      return { ...b, spentAmount, remainingAmount: limitAmount - spentAmount, percentage: Math.min(Math.round((spentAmount / limitAmount) * 100), 100) }
    })

    res.json({ data: result })
  } catch (e) {
    console.error('[dashboard/budgets] ERROR:', e.message, e.stack)
    res.status(500).json({ error: e.message })
  }
})

export default router

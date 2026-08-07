import { Router } from 'express'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { transactions } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/balance — total pemasukan bulan ini (income)
router.get('/', async (req, res) => {
  try {
    const now   = new Date()
    const month = parseInt(req.query.month) || now.getMonth() + 1
    const year  = parseInt(req.query.year)  || now.getFullYear()
    const m     = String(month).padStart(2, '0')
    const start = `${year}-${m}-01`
    const end   = `${year}-${m}-31`

    const rows = await db.select({
      total: sql`sum(${transactions.amount})::numeric`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, req.user.id),
      eq(transactions.type, 'income'),
      gte(transactions.transactionDate, start),
      lte(transactions.transactionDate, end),
    ))

    const total = parseFloat(rows[0]?.total || '0') || 0
    res.json({ data: { balance: total, month, year } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/balance — pemasukan saldo (top-up)
// Mencatat sebagai transaksi income sehingga menambah TOTAL PEMASUKAN di dashboard dan grafik.
router.post('/', async (req, res) => {
  try {
    const { amount, category_id, context_note } = req.body
    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'amount wajib diisi' })
    }
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      return res.status(400).json({ error: 'amount harus angka valid dan lebih dari 0' })
    }

    const row = await db.insert(transactions).values({
      id:              createId(),
      userId:          req.user.id,
      categoryId:      category_id || null,
      type:            'income',
      allocationType:  'pribadi',
      amount:          String(parsed),
      contextNote:     context_note || 'Pemasukan saldo',
      isSalarySplit:   false,
      transactionDate: new Date().toISOString().split('T')[0],
    }).returning()

    res.status(201).json({ data: row[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router

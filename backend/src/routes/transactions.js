import { Router } from 'express'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { transactions, allocationRules, categories } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { cacheRead, bustUserCache } from '../middleware/cache.js'

const router = Router()
router.use(requireAuth)

// GET /api/transactions?month=&year=&type=&allocation_type=
router.get('/', cacheRead({ ttl: 8 }), async (req, res) => {
  try {
    const now   = new Date()
    const month = parseInt(req.query.month) || now.getMonth() + 1
    const year  = parseInt(req.query.year)  || now.getFullYear()
    const m     = String(month).padStart(2, '0')

    const conditions = [
      eq(transactions.userId, req.user.id),
      gte(transactions.transactionDate, `${year}-${m}-01`),
      lte(transactions.transactionDate, `${year}-${m}-31`),
    ]
    if (req.query.type)            conditions.push(eq(transactions.type, req.query.type))
    if (req.query.allocation_type) conditions.push(eq(transactions.allocationType, req.query.allocation_type))

    const rows = await db.query.transactions.findMany({
      where:   and(...conditions),
      with:    { category: true },
      orderBy: [desc(transactions.transactionDate), desc(transactions.createdAt)],
    })
    res.json({ data: rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
    const { category_id, type, allocation_type, amount, context_note, transaction_date } = req.body
    if (!type || !allocation_type || !amount) {
      return res.status(400).json({ error: 'type, allocation_type, amount wajib diisi' })
    }
    const row = await db.insert(transactions).values({
      id:              createId(),
      userId:          req.user.id,
      categoryId:      category_id   || null,
      type,
      allocationType:  allocation_type,
      amount:          String(amount),
      contextNote:     context_note  || null,
      isSalarySplit:   false,
      transactionDate: transaction_date || new Date().toISOString().split('T')[0],
    }).returning()
    bustUserCache(req.user.id)
    res.status(201).json({ data: row[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/transactions/bulk  ← Mode Gajian
router.post('/bulk', async (req, res) => {
  try {
    const { salary_amount, transaction_date } = req.body
    if (!salary_amount) return res.status(400).json({ error: 'salary_amount wajib' })

    const rules = await db.query.allocationRules.findMany({
      where: eq(allocationRules.userId, req.user.id),
      with:  { targetCategory: true },
    })
    if (!rules.length) return res.status(400).json({ error: 'Atur alokasi gaji terlebih dahulu' })

    const date  = transaction_date || new Date().toISOString().split('T')[0]
    const total = parseFloat(salary_amount)
    let remaining = total

    const splits = rules.map((rule, i) => {
      const isLast  = i === rules.length - 1
      const nominal = isLast ? remaining : Math.floor(total * parseFloat(rule.percentage) / 100)
      remaining    -= nominal
      return {
        id:              createId(),
        userId:          req.user.id,
        categoryId:      rule.targetCategoryId || null,
        type:            'expense',
        allocationType:  rule.allocationType,
        amount:          String(nominal),
        contextNote:     `Alokasi gaji — ${rule.allocationType}`,
        isSalarySplit:   true,
        transactionDate: date,
      }
    })

    const incomeEntry = {
      id:              createId(),
      userId:          req.user.id,
      categoryId:      null,
      type:            'income',
      allocationType:  'pribadi',
      amount:          String(total),
      contextNote:     'Gaji bulanan',
      isSalarySplit:   true,
      transactionDate: date,
    }

    const rows = await db.insert(transactions).values([incomeEntry, ...splits]).returning()
    bustUserCache(req.user.id)
    res.status(201).json({ data: rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  try {
    const { category_id, type, allocation_type, amount, context_note, transaction_date } = req.body
    const row = await db.update(transactions)
      .set({
        categoryId:      category_id,
        type,
        allocationType:  allocation_type,
        amount:          amount ? String(amount) : undefined,
        contextNote:     context_note,
        transactionDate: transaction_date,
        updatedAt:       new Date(),
      })
      .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)))
      .returning()
    if (!row.length) return res.status(404).json({ error: 'Tidak ditemukan' })
    bustUserCache(req.user.id)
    res.json({ data: row[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const row = await db.delete(transactions)
      .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.id)))
      .returning()
    if (!row.length) return res.status(404).json({ error: 'Tidak ditemukan' })
    bustUserCache(req.user.id)
    res.json({ message: 'Berhasil dihapus' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router

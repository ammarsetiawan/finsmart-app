import { Router } from 'express'
import { eq, and } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { budgets } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// routing budget

router.get('/', async (req, res) => {
  try {
    const now   = new Date()
    const month = parseInt(req.query.month) || now.getMonth() + 1
    const year  = parseInt(req.query.year)  || now.getFullYear()
    const rows  = await db.query.budgets.findMany({
      where: and(eq(budgets.userId, req.user.id), eq(budgets.periodMonth, month), eq(budgets.periodYear, year)),
      with:  { category: true },
    })
    res.json({ data: rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { category_id, limit_amount, period_month, period_year } = req.body
    if (!category_id || !limit_amount) return res.status(400).json({ error: 'category_id dan limit_amount wajib' })
    const now = new Date()
    const row = await db.insert(budgets).values({
      id: createId(), userId: req.user.id,
      categoryId: category_id, limitAmount: String(limit_amount),
      periodMonth: period_month || now.getMonth() + 1,
      periodYear:  period_year  || now.getFullYear(),
    }).returning()
    res.status(201).json({ data: row[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const row = await db.update(budgets)
      .set({ limitAmount: String(req.body.limit_amount), updatedAt: new Date() })
      .where(and(eq(budgets.id, req.params.id), eq(budgets.userId, req.user.id)))
      .returning()
    if (!row.length) return res.status(404).json({ error: 'Tidak ditemukan' })
    res.json({ data: row[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await db.delete(budgets).where(and(eq(budgets.id, req.params.id), eq(budgets.userId, req.user.id)))
    res.json({ message: 'Berhasil dihapus' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router

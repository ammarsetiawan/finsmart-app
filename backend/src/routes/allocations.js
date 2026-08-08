import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { allocationRules } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { cacheRead, bustUserCache } from '../middleware/cache.js'

const router = Router()
router.use(requireAuth)


router.get('/', cacheRead({ ttl: 30 }), async (req, res) => {
  try {
    const rows = await db.query.allocationRules.findMany({
      where: eq(allocationRules.userId, req.user.id),
      with:  { targetCategory: true },
    })
    res.json({ data: rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Upsert semua 3 tipe sekaligus
// body: { rules: [{ allocation_type, percentage, target_category_id }] }
router.post('/', async (req, res) => {
  try {
    const { rules } = req.body
    if (!Array.isArray(rules) || rules.length !== 3) {
      return res.status(400).json({ error: 'Harus ada tepat 3 rules: pribadi, keluarga, tabungan' })
    }
    const total = rules.reduce((s, r) => s + parseFloat(r.percentage), 0)
    if (Math.round(total) !== 100) {
      return res.status(400).json({ error: `Total persentase harus 100%, sekarang ${total}%` })
    }
    await db.delete(allocationRules).where(eq(allocationRules.userId, req.user.id))
    const rows = await db.insert(allocationRules).values(
      rules.map(r => ({
        id:               createId(),
        userId:           req.user.id,
        allocationType:   r.allocation_type,
        percentage:       String(r.percentage),
        targetCategoryId: r.target_category_id || null,
      }))
    ).returning()
    bustUserCache(req.user.id)
    res.status(201).json({ data: rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Preview split nominal — tidak simpan ke DB
router.post('/preview', async (req, res) => {
  try {
    const { salary_amount } = req.body
    if (!salary_amount) return res.status(400).json({ error: 'salary_amount wajib' })

    const rules = await db.query.allocationRules.findMany({
      where: eq(allocationRules.userId, req.user.id),
      with:  { targetCategory: true },
    })
    if (!rules.length) return res.status(400).json({ error: 'Aturan alokasi belum diset' })

    const total = parseFloat(salary_amount)
    let remaining = total

    const preview = rules.map((r, i) => {
      const isLast  = i === rules.length - 1
      const nominal = isLast ? remaining : Math.floor(total * parseFloat(r.percentage) / 100)
      remaining    -= nominal
      return { allocationType: r.allocationType, percentage: parseFloat(r.percentage), nominal, targetCategory: r.targetCategory }
    })

    res.json({ data: { salaryAmount: total, preview } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router

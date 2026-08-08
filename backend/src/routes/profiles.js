import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { profiles } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { cacheRead, bustUserCache } from '../middleware/cache.js'

const router = Router()
router.use(requireAuth)

// profil user

// GET /api/profiles/me
router.get('/me', cacheRead({ ttl: 20 }), async (req, res) => {
  try {
    const row = await db.query.profiles.findFirst({
      where: eq(profiles.userId, req.user.id),
    })
    if (!row) return res.status(404).json({ error: 'Profil belum dibuat' })
    res.json({ data: row })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/profiles — buat profil setelah register
router.post('/', async (req, res) => {
  try {
    const fullName = req.body.full_name ?? req.body.fullName
    const monthlyIncome = req.body.monthly_income ?? req.body.monthlyIncome

    if (!fullName) return res.status(400).json({ error: 'full_name wajib' })

    const existing = await db.query.profiles.findFirst({
      where: eq(profiles.userId, req.user.id),
    })

    if (existing) {
      return res.json({ data: existing })
    }

    const row = await db.insert(profiles).values({
      id:            createId(),
      userId:        req.user.id,
      fullName,
      monthlyIncome: monthlyIncome !== undefined ? String(monthlyIncome) : '0',
    }).returning()

    bustUserCache(req.user.id)
    res.status(201).json({ data: row[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/profiles/me
// Semua field opsional — hanya update yang dikirim
router.put('/me', async (req, res) => {
  try {
    const { full_name, monthly_income } = req.body

    if (!full_name && monthly_income === undefined) {
      return res.status(400).json({ error: 'Minimal satu field harus diisi' })
    }

    const updates = { updatedAt: new Date() }
    if (full_name      !== undefined) updates.fullName      = full_name
    if (monthly_income !== undefined) updates.monthlyIncome = String(monthly_income)

    const row = await db.update(profiles)
      .set(updates)
      .where(eq(profiles.userId, req.user.id))
      .returning()

    if (!row.length) return res.status(404).json({ error: 'Profil tidak ditemukan' })
    bustUserCache(req.user.id)
    res.json({ data: row[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
import { Router } from 'express'
import { eq, and } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'
import { db } from '../db/index.js'
import { categories } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import { cacheRead, bustUserCache } from '../middleware/cache.js'

const router = Router()
router.use(requireAuth)

router.get('/', cacheRead({ ttl: 30 }), async (req, res) => {
  try {
    const rows = await db.query.categories.findMany({
      where:   eq(categories.userId, req.user.id),
      orderBy: categories.name,
    })
    res.json({ data: rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  try {
    const { name, allocation_type, color, icon, is_salary } = req.body
    if (!name || !allocation_type) return res.status(400).json({ error: 'name dan allocation_type wajib' })
    const row = await db.insert(categories).values({
      id: createId(), userId: req.user.id,
      name, allocationType: allocation_type,
      color: color || '#6366f1', icon: icon || 'wallet',
      isSalary: is_salary || false, isDefault: false,
    }).returning()
    bustUserCache(req.user.id)
    res.status(201).json({ data: row[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, color, icon } = req.body
    const row = await db.update(categories)
      .set({ name, color, icon })
      .where(and(eq(categories.id, req.params.id), eq(categories.userId, req.user.id)))
      .returning()
    if (!row.length) return res.status(404).json({ error: 'Tidak ditemukan' })
    bustUserCache(req.user.id)
    res.json({ data: row[0] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const row = await db.delete(categories)
      .where(and(eq(categories.id, req.params.id), eq(categories.userId, req.user.id), eq(categories.isDefault, false)))
      .returning()
    if (!row.length) return res.status(404).json({ error: 'Tidak ditemukan atau kategori default' })
    bustUserCache(req.user.id)
    res.json({ message: 'Berhasil dihapus' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router

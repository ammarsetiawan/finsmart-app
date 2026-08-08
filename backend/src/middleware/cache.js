// ── Cache respons GET (in-memory, per-instance) ───────────────
// Mempercepat request read-only yang datanya jarang berubah
// (dashboard summary, insight, list transaksi/kategori/budget dsb)
// dengan TTL pendek. Cache di-scope per user sehingga tidak bocor
// antar akun, dan bisa diinvalidasi per-user setelah mutasi.

const cacheStore = new Map() // key -> { body, exp }
const keysByUser = new Map() // userId -> Set<key>

function digest(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

/**
 * @param {object} opts
 * @param {number} opts.ttl TTL dalam detik (default 10)
 */
export function cacheRead({ ttl = 10 } = {}) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next()

    const uid = req.user?.id || 'anon'
    const key = digest(`${uid}|${req.originalUrl}`)

    const hit = cacheStore.get(key)
    if (hit && Date.now() < hit.exp) {
      return res.set('X-Cache', 'HIT').json(hit.body)
    }

    const originalJson = res.json.bind(res)
    res.json = (body) => {
      if (res.statusCode === 200 && body && body.data != null) {
        cacheStore.set(key, { body, exp: Date.now() + ttl * 1000 })
        if (!keysByUser.has(uid)) keysByUser.set(uid, new Set())
        keysByUser.get(uid).add(key)
      }
      return originalJson(body)
    }
    res.set('X-Cache', 'MISS')
    next()
  }
}

// Hapus semua entri cache milik user tertentu.
// Panggil setelah operasi mutasi (tambah/hapus/update transaksi,
// kategori, budget, alokasi, balance) agar data langsung segar.
export function bustUserCache(userId) {
  if (!userId) return
  const uid = String(userId)
  const keys = keysByUser.get(uid)
  if (!keys) return
  for (const k of keys) cacheStore.delete(k)
  keysByUser.delete(uid)
}


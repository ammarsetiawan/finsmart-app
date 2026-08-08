import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'
import 'dotenv/config'

// Database client dibuat lazy (baru terhubung saat pertama kali dipakai).
// Ini penting agar di lingkungan serverless (Vercel) function tidak crash
// saat cold-start hanya karena env belum tersedia sesaat atau koneksi belum dibuka.
let client = null
let dbCache = null

function getClient() {
  if (client) return client
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured. Set it in backend/.env or Vercel env vars.')
  }
  // Supabase pooler port 5432 = mode SESSION dengan limit ~15 sesi bersamaan.
  // Untuk mencegah "max clients reached (pool_size: 15)" kita batasi koneksi
  // bersamaan ke 1 dan biarkan postgres-js mengantri query paralel. Ini paling
  // aman di mode session (koneksi dipakai berurutan, tidak menumpuk).
  const poolSize = Math.max(1, Math.min(Number(process.env.PG_POOL_SIZE) || 1, 3))
  client = postgres(databaseUrl, {
    ssl: { rejectUnauthorized: false },
    max: poolSize,
    max_lifetime: 300,        // buang koneksi diam > 5 mnt utk cegah penumpukan
    idle_timeout: 30,
    connection_timeout: 10,
    prepare: false,           // hindari prepared statement server-side yg bisa bocor
    onnotice: () => {},       // diamkan notice dari Supabase pgBouncer/connection
    transform: {
      column: { to: undefined },
      value:  { to: undefined },
    },
  })
  return client
}

export function getDb() {
  if (dbCache) return dbCache
  dbCache = drizzle(getClient(), { schema })
  return dbCache
}

// Ekspor `db` sebagai lazy accessor — setiap pemakaian akan memanggil getDb().
// Method dibind ke instance db asli agar konteks `this` di dalam drizzle tetap benar.
export const db = new Proxy({}, {
  get(_t, prop) {
    const real = getDb()
    const val = real[prop]
    if (typeof val === 'function') return val.bind(real)
    return val
  },
})

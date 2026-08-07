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
  client = postgres(databaseUrl, {
    ssl: 'require',
    max: 10,
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

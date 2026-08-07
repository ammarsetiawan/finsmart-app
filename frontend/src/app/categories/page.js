import Categories from '@/client/categoriesclient'
import { ProtectedRoute } from '@/lib/protected-route'

export const metadata = {
  title:       'Kategori',
  description: 'Kelola kategori transaksi — Pribadi, Keluarga, dan Tabungan.',
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Categories />
    </ProtectedRoute>
  )
}
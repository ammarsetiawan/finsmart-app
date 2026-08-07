import Transaction from '@/client/transactionsclient'
import { ProtectedRoute } from '@/lib/protected-route'

export const metadata = {
  title:       'Transaksi',
  description: 'Catat dan kelola semua transaksi keuangan harian. Filter berdasarkan kategori, tipe, dan periode.',
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Transaction />
    </ProtectedRoute>
  )
}
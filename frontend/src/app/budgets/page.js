import Bugdets from '@/client/budgetsclient'
import { ProtectedRoute } from '@/lib/protected-route'

export const metadata = {
  title:       'Budget',
  description: 'Atur batas pengeluaran per kategori setiap bulan dan pantau progresnya secara real-time.',
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Bugdets />
    </ProtectedRoute>
  )
}
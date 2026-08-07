import BalanceClient from '@/client/balanceclient'
import { ProtectedRoute } from '@/lib/protected-route'

export const metadata = {
  title: 'Pemasukan Saldo',
  description: 'Tambah saldo dompet Anda (top-up).',
}

export default function Page() {
  return (
    <ProtectedRoute>
      <BalanceClient />
    </ProtectedRoute>
  )
}

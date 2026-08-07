import AdminClient from '@/client/adminclient'
import { ProtectedRoute } from '@/lib/protected-route'

export const metadata = {
  title:       'Admin & Monitoring',
  description: 'Dashboard monitoring backend — statistik agregat seluruh pengguna Fin Smart (khusus admin).',
}

export default function Page() {
  return (
    <ProtectedRoute>
      <AdminClient />
    </ProtectedRoute>
  )
}


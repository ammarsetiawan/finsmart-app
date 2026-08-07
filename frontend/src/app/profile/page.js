import Profile from '@/client/profileclient'
import { ProtectedRoute } from '@/lib/protected-route'

export const metadata = {
  title:       'Profile',
  description: 'Identitas Data pengguna yang meliputi aspek tabungan dan hubungan Uang',
}

export default function Page() {
  return (
    <ProtectedRoute>
      <Profile />
    </ProtectedRoute>
  )
}
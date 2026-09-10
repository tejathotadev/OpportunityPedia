import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuthStore } from '@/app/store/useAuthStore'

/** Guards the hidden admin console. No marketing links point here. */
export function RequireAdminAuth({ children }: { children: ReactNode }) {
  const admin = useAuthStore((s) => s.admin)
  const location = useLocation()

  if (!admin?.token) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return children
}

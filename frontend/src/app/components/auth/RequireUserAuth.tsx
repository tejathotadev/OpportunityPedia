import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'

import { useAuthStore } from '@/app/store/useAuthStore'
import { CUSTOMER_HOME, peekCustomerSignedOut } from '@/app/utils/authRedirect'

/** Sends unsigned visitors to `/login`, preserving the intended destination. */
export function RequireUserAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user?.token) {
    // After an explicit Sign out, never restore the page we left.
    const from = peekCustomerSignedOut()
      ? CUSTOMER_HOME
      : `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return children
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Public profile fields returned by `/auth/login` and `/admin/login`. */
export interface AuthProfile {
  id: number | string
  name: string
  email: string
  role: string
  status: string
  company?: string | null
  phone?: string | null
}

interface Session {
  token: string
  profile: AuthProfile
}

interface AuthState {
  user: Session | null
  admin: Session | null
  setUserSession: (session: Session) => void
  clearUserSession: () => void
  setAdminSession: (session: Session) => void
  clearAdminSession: () => void
}

/**
 * Persisted sessions for the product (`user`) and the hidden admin console
 * (`admin`). Tokens are sent as Bearer headers; never put secrets in source.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      admin: null,
      setUserSession: (user) => set({ user }),
      clearUserSession: () => set({ user: null }),
      setAdminSession: (admin) => set({ admin }),
      clearAdminSession: () => set({ admin: null }),
    }),
    { name: 'op-auth' },
  ),
)

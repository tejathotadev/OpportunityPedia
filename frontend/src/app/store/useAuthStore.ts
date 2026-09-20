import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Public profile fields returned by `/auth/login` and `/admin/login`. */
export interface AuthProfile {
  id: number | string
  name: string
  email: string
  role: string
  status: string
  plan?: string
  workspace_id?: number | string
  seat_role?: 'owner' | 'member' | string
  company?: string | null
  phone?: string | null
  is_demo?: boolean
}

interface Session {
  token: string
  profile: AuthProfile
}

interface AuthState {
  user: Session | null
  admin: Session | null
  setUserSession: (session: Session) => void
  patchUserProfile: (profile: Partial<AuthProfile>) => void
  clearUserSession: () => void
  setAdminSession: (session: Session) => void
  clearAdminSession: () => void
}

/** Drop legacy localStorage sessions so closing the browser always requires login. */
try {
  localStorage.removeItem('op-auth')
} catch {
  // Ignore private-mode / unavailable storage.
}

/**
 * Session-only auth for the product (`user`) and admin console (`admin`).
 * Uses sessionStorage so tokens are cleared when the browser/tab session ends.
 * Tokens are sent as Bearer headers; never put secrets in source.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      admin: null,
      setUserSession: (user) => set({ user }),
      patchUserProfile: (profile) =>
        set((state) => {
          if (!state.user) return state
          return { user: { ...state.user, profile: { ...state.user.profile, ...profile } } }
        }),
      clearUserSession: () => set({ user: null }),
      setAdminSession: (admin) => set({ admin }),
      clearAdminSession: () => set({ admin: null }),
    }),
    {
      name: 'op-auth',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)

import { createContext, use } from 'react'

import type { User } from '@/app/types'

export interface CurrentUserContextValue {
  user: User
  team: User[]
  /** Permission flags; the backend will supply the real values with the session. */
  can: {
    reassign: boolean
    unassign: boolean
    manageSources: boolean
  }
}

export const CurrentUserContext = createContext<CurrentUserContextValue | null>(null)

export function useCurrentUser(): CurrentUserContextValue {
  const context = use(CurrentUserContext)
  if (!context) throw new Error('useCurrentUser must be used inside CurrentUserProvider')
  return context
}

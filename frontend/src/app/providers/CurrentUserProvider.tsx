import { useEffect, type ReactNode } from 'react'

import { CURRENT_USER } from '@/app/config/currentUser'
import { setAuthTokenProvider } from '@/app/services/api'
import { useAuthStore, type AuthProfile } from '@/app/store/useAuthStore'
import type { User } from '@/app/types'

import { CurrentUserContext, type CurrentUserContextValue } from './currentUserContext'

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function toAppUser(profile: AuthProfile): User {
  return {
    id: String(profile.id),
    name: profile.name || profile.email,
    initials: initialsFrom(profile.name || profile.email),
    email: profile.email,
    jobTitle: 'Member',
    company: profile.company?.trim() || '—',
    phone: profile.phone ?? undefined,
    avatarTone: 'teal',
  }
}

/**
 * Resolves the signed-in product user from the auth session. Falls back to the
 * hardcoded demo user only when no session exists (should not happen behind
 * RequireUserAuth).
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.user)

  useEffect(() => {
    setAuthTokenProvider(() => useAuthStore.getState().user?.token ?? null)
    return () => setAuthTokenProvider(() => null)
  }, [])

  const user = session ? toAppUser(session.profile) : CURRENT_USER

  const value: CurrentUserContextValue = {
    user,
    team: [user],
    can: { reassign: false, unassign: true, manageSources: false },
  }

  return <CurrentUserContext value={value}>{children}</CurrentUserContext>
}

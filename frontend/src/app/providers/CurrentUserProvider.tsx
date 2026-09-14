import { useQuery } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'

import { CURRENT_USER } from '@/app/config/currentUser'
import { setAuthTokenProvider } from '@/app/services/api'
import { queryKeys } from '@/app/services/queryKeys'
import { listWorkspaceTeam, type WorkspaceMember } from '@/app/services/workspace'
import { useAuthStore, type AuthProfile } from '@/app/store/useAuthStore'
import type { User } from '@/app/types'

import { CurrentUserContext, type CurrentUserContextValue } from './currentUserContext'

const AVATAR_TONES: NonNullable<User['avatarTone']>[] = ['teal', 'navy', 'plum', 'sand', 'slate']

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function seatLabel(profile: Pick<AuthProfile, 'seat_role' | 'status'>): string {
  const seat = (profile.seat_role || 'owner').toLowerCase()
  if (profile.status === 'pending_password') return 'Invite pending'
  return seat === 'owner' ? 'Owner' : 'Member'
}

function toAppUser(profile: AuthProfile, tone: User['avatarTone'] = 'teal'): User {
  return {
    id: String(profile.id),
    name: profile.name || profile.email,
    initials: initialsFrom(profile.name || profile.email),
    email: profile.email,
    jobTitle: seatLabel(profile),
    company: profile.company?.trim() || '—',
    phone: profile.phone ?? undefined,
    avatarTone: tone,
  }
}

function memberToUser(member: WorkspaceMember, index: number): User {
  return toAppUser(
    {
      id: member.id,
      name: member.name,
      email: member.email,
      role: 'customer',
      status: member.status,
      seat_role: member.seat_role,
      company: member.company,
      phone: member.phone,
    },
    AVATAR_TONES[index % AVATAR_TONES.length],
  )
}

/**
 * Resolves the signed-in product user from the auth session and loads workspace
 * teammates for ownership / Settings. Falls back to the demo user only when no
 * session exists (should not happen behind RequireUserAuth).
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.user)

  useEffect(() => {
    setAuthTokenProvider(() => useAuthStore.getState().user?.token ?? null)
    return () => setAuthTokenProvider(() => null)
  }, [])

  const teamQuery = useQuery({
    queryKey: queryKeys.workspaceTeam(),
    queryFn: listWorkspaceTeam,
    enabled: Boolean(session?.token),
  })

  const user = session ? toAppUser(session.profile) : CURRENT_USER
  const teamFromApi = (teamQuery.data?.members ?? []).map(memberToUser)
  const team = teamFromApi.length > 0 ? teamFromApi : [user]
  const seatRole = (session?.profile.seat_role || 'owner').toLowerCase()

  const value: CurrentUserContextValue = {
    user,
    team,
    can: {
      reassign: seatRole === 'owner',
      unassign: true,
      manageSources: seatRole === 'owner',
    },
  }

  return <CurrentUserContext value={value}>{children}</CurrentUserContext>
}

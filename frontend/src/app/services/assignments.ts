import type { Assignment, Opportunity, TeamOwnershipRow, User } from '@/app/types'

import { api } from './api'

function assignmentPath(opportunityId: string, suffix: '/assign' | '/assignments'): string {
  return `/opportunities/${encodeURIComponent(opportunityId)}${suffix}`
}

/**
 * The backend derives the acting user from the session and owns the audit
 * trail, so only the assignment target is sent.
 */
export async function assignOpportunity(
  opportunityId: string,
  user: User,
): Promise<Opportunity> {
  const { data } = await api.post<Opportunity>(assignmentPath(opportunityId, '/assign'), {
    userId: user.id,
  })
  return data
}

export async function reassignOpportunity(
  opportunityId: string,
  targetUserId: string,
): Promise<Opportunity> {
  const { data } = await api.post<Opportunity>(assignmentPath(opportunityId, '/assign'), {
    userId: targetUserId,
  })
  return data
}

export async function unassignOpportunity(opportunityId: string): Promise<Opportunity> {
  const { data } = await api.delete<Opportunity>(assignmentPath(opportunityId, '/assign'))
  return data
}

export async function getMyAssignments(): Promise<Opportunity[]> {
  const { data } = await api.get<{ items: Opportunity[] }>('/assignments/me')
  return data.items
}

export async function getAssignmentHistory(opportunityId: string): Promise<Assignment[]> {
  const { data } = await api.get<{ items: Assignment[] }>(
    assignmentPath(opportunityId, '/assignments'),
  )
  return data.items
}

export async function getTeamOwnership(): Promise<TeamOwnershipRow[]> {
  const { data } = await api.get<{ items: TeamOwnershipRow[] }>('/team/ownership')
  return data.items
}

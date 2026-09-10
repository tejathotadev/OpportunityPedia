import type { ActivityType, OpportunityActivity } from '@/app/types'

import { api } from './api'

export interface TeamActivityQuery {
  actorId?: string
  type?: ActivityType[]
  opportunityId?: string
  withinDays?: number
  limit?: number
}

export async function getTeamActivity(
  query: TeamActivityQuery = {},
): Promise<OpportunityActivity[]> {
  const { data } = await api.get<{ items: OpportunityActivity[] }>('/activity', {
    params: {
      actor_id: query.actorId,
      type: query.type,
      opportunity_id: query.opportunityId,
      within_days: query.withinDays,
      limit: query.limit,
    },
  })
  return data.items
}

export async function getOpportunityActivity(
  opportunityId: string,
): Promise<OpportunityActivity[]> {
  const { data } = await api.get<{ items: OpportunityActivity[] }>(
    `/opportunities/${opportunityId}/activity`,
  )
  return data.items
}

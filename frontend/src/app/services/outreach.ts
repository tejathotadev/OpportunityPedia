import type { Opportunity, Outreach, SendOutreachPayload } from '@/app/types'

import { api } from './api'

export interface SendOutreachResult {
  outreach: Outreach
  opportunity: Opportunity
}

/**
 * Sending is a backend responsibility: it authenticates the sender, delivers
 * the message and writes the audit record. The frontend only ever hands over
 * the composed payload — no credentials are involved here.
 */
export async function sendOutreach(payload: SendOutreachPayload): Promise<SendOutreachResult> {
  const { data } = await api.post<SendOutreachResult>('/outreach', payload)
  return data
}

export async function getOutreachForOpportunity(opportunityId: string): Promise<Outreach[]> {
  const { data } = await api.get<{ items: Outreach[] }>(
    `/opportunities/${opportunityId}/outreach`,
  )
  return data.items
}

export async function markFollowUpRequired(opportunityId: string): Promise<Opportunity> {
  const { data } = await api.post<Opportunity>(`/opportunities/${opportunityId}/follow-up`, {})
  return data
}

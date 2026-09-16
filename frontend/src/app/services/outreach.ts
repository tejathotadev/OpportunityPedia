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

export interface AiOutreachDraft {
  subject: string
  body: string
  model?: string | null
}

/** Generate a professional subject + body from opportunity context (never sends). */
export async function generateAiOutreachDraft(input: {
  opportunityId: string
  styleHint?: string
}): Promise<AiOutreachDraft> {
  const { data } = await api.post<AiOutreachDraft>('/outreach/ai-draft', {
    opportunity_id: input.opportunityId,
    style_hint: input.styleHint,
  })
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

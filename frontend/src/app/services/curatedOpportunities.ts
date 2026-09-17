import { api } from '@/app/services/api'

export type CuratedCategory = 'commercial' | 'government'

export type CuratedCommercialType =
  | 'hiring_requirement'
  | 'c2c_requirement'
  | 'vendor_requirement'
  | 'vendor_partnership'
  | 'contract_staffing'
  | 'w2_requirement'
  | 'other'

export type CuratedGovernmentType = 'government_tender' | 'procurement' | 'rfp' | 'other'

export type CuratedPriority = 'very_hot'

export interface CuratedOpportunityAdmin {
  id: string
  category: CuratedCategory
  opportunityType: string
  company: string
  title: string
  location: string
  engagement?: string | null
  duration?: string | null
  openings?: number | null
  experience?: string | null
  skills: string[]
  technologies: string[]
  vendorLookingFor?: string | null
  partnershipModel?: string | null
  clientIndustry?: string | null
  candidateRequirement?: string | null
  contactName?: string | null
  contactEmail?: string | null
  priority: CuratedPriority
  description: string
  detectedAt?: string | null
  status: 'active' | 'archived'
  visibleWorkspaceIds: number[]
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CuratedOpportunityInput {
  category: CuratedCategory
  opportunity_type: string
  company?: string
  title: string
  location?: string
  engagement?: string
  duration?: string
  openings?: number | null
  experience?: string
  skills?: string[]
  technologies?: string[]
  vendor_looking_for?: string
  partnership_model?: string
  client_industry?: string
  candidate_requirement?: string
  contact_name?: string
  contact_email?: string
  priority: CuratedPriority
  description?: string
  detected_at?: string
  visible_to_user_ids: number[]
}

export const COMMERCIAL_TYPE_OPTIONS: { value: CuratedCommercialType; label: string }[] = [
  { value: 'hiring_requirement', label: 'Hiring Requirement' },
  { value: 'c2c_requirement', label: 'C2C Requirement' },
  { value: 'vendor_requirement', label: 'Vendor Requirement' },
  { value: 'vendor_partnership', label: 'Vendor Partnership' },
  { value: 'contract_staffing', label: 'Contract Staffing' },
  { value: 'w2_requirement', label: 'W2 Requirement' },
  { value: 'other', label: 'Other' },
]

export const GOVERNMENT_TYPE_OPTIONS: { value: CuratedGovernmentType; label: string }[] = [
  { value: 'government_tender', label: 'Government Tender' },
  { value: 'rfp', label: 'RFP' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'other', label: 'Other' },
]

export async function listCuratedOpportunities(
  token: string,
  includeArchived = false,
): Promise<CuratedOpportunityAdmin[]> {
  const { data } = await api.get<{ items: CuratedOpportunityAdmin[] }>(
    '/admin/curated-opportunities',
    {
      headers: { Authorization: `Bearer ${token}` },
      params: includeArchived ? { include_archived: true } : undefined,
    },
  )
  return data.items ?? []
}

export async function createCuratedOpportunity(
  token: string,
  body: CuratedOpportunityInput,
): Promise<CuratedOpportunityAdmin> {
  const { data } = await api.post<CuratedOpportunityAdmin>('/admin/curated-opportunities', body, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

export async function updateCuratedOpportunity(
  token: string,
  id: string,
  body: CuratedOpportunityInput,
): Promise<CuratedOpportunityAdmin> {
  const { data } = await api.patch<CuratedOpportunityAdmin>(
    `/admin/curated-opportunities/${id}`,
    body,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

export async function archiveCuratedOpportunity(
  token: string,
  id: string,
): Promise<CuratedOpportunityAdmin> {
  const { data } = await api.post<CuratedOpportunityAdmin>(
    `/admin/curated-opportunities/${id}/archive`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  )
  return data
}

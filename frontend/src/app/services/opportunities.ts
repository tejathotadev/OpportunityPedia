import type {
  CompanyHiringSignal,
  Opportunity,
  OpportunityCompanyRow,
  OpportunityFilters,
  Paginated,
  SortState,
} from '@/app/types'
import { type OpportunitySortKey } from '@/app/utils/opportunity'

import { api } from './api'

export interface OpportunityQuery {
  filters?: OpportunityFilters
  sort?: SortState<OpportunitySortKey>
  page?: number
  pageSize?: number
}

export type CompanySortKey =
  | 'companyName'
  | 'matchingCount'
  | 'lastDetectedAt'
  | 'temperature'
  | 'actions'

/** Maps UI query state onto the query string the REST API is expected to take. */
function toQueryParams(query: OpportunityQuery): Record<string, unknown> {
  const { filters = {}, sort, page = 1, pageSize = 25 } = query
  return {
    q: filters.search || undefined,
    title_match: filters.titleMatch || undefined,
    temperature: filters.temperature,
    type: filters.type,
    industry: filters.industry,
    country: filters.country,
    company_id: filters.companyId,
    detected_within_days: filters.detectedWithinDays,
    deadline_within_days: filters.deadlineWithinDays,
    source: filters.source,
    sort_by: sort?.key,
    sort_dir: sort?.direction,
    page,
    page_size: pageSize,
  }
}

export async function getOpportunities(
  query: OpportunityQuery,
): Promise<Paginated<Opportunity>> {
  const { data } = await api.get<Paginated<Opportunity>>('/opportunities', {
    params: toQueryParams(query),
  })
  return data
}

/** Company-first index: one row per employer with matching opportunity counts. */
export async function getOpportunityCompanies(query: {
  filters?: OpportunityFilters
  sort?: SortState<CompanySortKey>
  page?: number
  pageSize?: number
}): Promise<Paginated<OpportunityCompanyRow>> {
  const { filters = {}, sort, page = 1, pageSize = 25 } = query
  const { data } = await api.get<Paginated<OpportunityCompanyRow>>('/opportunities/companies', {
    params: {
      company_q: filters.search || undefined,
      title_match: filters.titleMatch || undefined,
      temperature: filters.temperature,
      type: filters.type,
      industry: filters.industry,
      country: filters.country,
      detected_within_days: filters.detectedWithinDays,
      deadline_within_days: filters.deadlineWithinDays,
      sort_by: sort?.key === 'temperature' ? undefined : sort?.key,
      sort_dir: sort?.direction,
      page,
      page_size: pageSize,
    },
  })
  return data
}

/** Unpaginated read used by the dashboard widgets. */
export async function getAllOpportunities(): Promise<Opportunity[]> {
  const { data } = await api.get<Paginated<Opportunity>>('/opportunities', {
    params: { page_size: 500 },
    timeout: 60_000,
  })
  return data.items
}

export async function getOpportunityById(id: string): Promise<Opportunity> {
  const { data } = await api.get<Opportunity>(`/opportunities/${id}`)
  return data
}

/** Facets + filtered opening count for commercial outreach (no job list). */
export async function getCompanyHiringSignal(
  companyId: string,
  filters?: { teams?: string[]; locations?: string[]; flexibilities?: string[] },
): Promise<CompanyHiringSignal> {
  const { data } = await api.get<CompanyHiringSignal>(
    `/opportunities/companies/${encodeURIComponent(companyId)}/hiring-signal`,
    {
      params: {
        team: filters?.teams?.length ? filters.teams : undefined,
        location: filters?.locations?.length ? filters.locations : undefined,
        flexibility: filters?.flexibilities?.length ? filters.flexibilities : undefined,
      },
      paramsSerializer: {
        indexes: null,
      },
    },
  )
  return data
}

/** Records a manual note against an opportunity; used by the detail panel. */
export async function addOpportunityNote(opportunityId: string, note: string): Promise<void> {
  await api.post(`/opportunities/${opportunityId}/notes`, { note })
}

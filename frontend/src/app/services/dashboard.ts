import type {
  AttentionRow,
  DashboardMetrics,
  Opportunity,
  OpportunityType,
  PipelineSummary,
} from '@/app/types'

import { api } from './api'

/**
 * Narrows a dashboard widget to one category and/or lookback window. Both are
 * applied server-side against stored rows, so changing them never triggers an
 * upstream scan.
 */
export interface DashboardScope {
  /** Empty or omitted means every type. */
  types?: OpportunityType[]
  /** Days back to count from; omitted means the full stored history. */
  detectedWithinDays?: number
  /** Country codes to keep; omitted means everywhere. */
  countries?: string[]
}

function scopeParams({ types, detectedWithinDays, countries }: DashboardScope) {
  return {
    ...(types?.length ? { type: types } : {}),
    ...(detectedWithinDays ? { detected_within_days: detectedWithinDays } : {}),
    ...(countries?.length ? { country: countries } : {}),
  }
}

export async function getDashboardMetrics(scope: DashboardScope = {}): Promise<DashboardMetrics> {
  const { data } = await api.get<DashboardMetrics>('/dashboard/metrics', {
    params: scopeParams(scope),
  })
  return data
}

export async function getPipelineSummary(): Promise<PipelineSummary> {
  const { data } = await api.get<PipelineSummary>('/dashboard/pipeline')
  return data
}

export async function getNeedsAttention(
  limit = 8,
  scope: DashboardScope = {},
): Promise<AttentionRow[]> {
  const { data } = await api.get<{ items: AttentionRow[] }>('/dashboard/needs-attention', {
    params: { limit, ...scopeParams(scope) },
  })
  return data.items
}

export async function getUpcomingDeadlines(limit = 6): Promise<Opportunity[]> {
  const { data } = await api.get<{ items: Opportunity[] }>('/dashboard/deadlines', {
    params: { limit },
  })
  return data.items
}

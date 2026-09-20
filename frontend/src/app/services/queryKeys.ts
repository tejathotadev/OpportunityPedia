import type { OpportunityFilters, SortState } from '@/app/types'

/** Central key registry so mutations can invalidate precisely. */
export const queryKeys = {
  opportunities: (filters?: OpportunityFilters, sort?: SortState, page?: number, size?: number) =>
    ['opportunities', { filters, sort, page, size }] as const,
  opportunityCompanies: (
    filters?: OpportunityFilters,
    sort?: SortState,
    page?: number,
    size?: number,
  ) => ['opportunities', 'companies', { filters, sort, page, size }] as const,
  companyHiringSignal: (
    companyId: string,
    filters?: { teams?: string[]; locations?: string[]; flexibilities?: string[] },
  ) => ['opportunities', 'companies', companyId, 'hiring-signal', filters] as const,
  sharedOpportunities: (category?: string) =>
    ['opportunities', 'shared', category ?? 'all'] as const,
  opportunity: (id: string) => ['opportunity', id] as const,
  opportunityActivity: (id: string) => ['opportunity', id, 'activity'] as const,
  opportunityOutreach: (id: string) => ['opportunity', id, 'outreach'] as const,
  teamActivity: (query?: unknown) => ['activity', query] as const,
  teamOwnership: () => ['team', 'ownership'] as const,
  dashboardMetrics: (category = 'all', range = 'any', country = 'any') =>
    ['dashboard', 'metrics', category, range, country] as const,
  dashboardOverview: (category = 'all', range = 'any', country = 'any') =>
    ['dashboard', 'overview', category, range, country] as const,
  pipeline: () => ['dashboard', 'pipeline'] as const,
  needsAttention: (category = 'all', range = 'any', country = 'any') =>
    ['dashboard', 'needs-attention', category, range, country] as const,
  deadlines: () => ['dashboard', 'deadlines'] as const,
  myAssignments: () => ['assignments', 'me'] as const,
  notifications: () => ['notifications'] as const,
  radarStatus: () => ['radar', 'status'] as const,
  radarRuns: () => ['radar', 'runs'] as const,
  workspaceTeam: () => ['workspace', 'team'] as const,
  workspacePlan: () => ['workspace', 'plan'] as const,
  workspaceSmtp: () => ['workspace', 'smtp'] as const,
}

/** Everything that can change after an assignment or outreach action. */
export const INVALIDATE_ON_MUTATION = [
  ['opportunities'],
  ['opportunity'],
  ['activity'],
  ['dashboard'],
  ['assignments'],
  ['team'],
]

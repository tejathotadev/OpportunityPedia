import { useQuery } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/app/components/feedback/States'
import { PageHeader } from '@/app/components/layout/PageHeader'
import { Panel } from '@/app/components/layout/Panel'
import { Pagination } from '@/app/components/tables/Pagination'
import { SingleSelectFilter, type FilterOption } from '@/app/components/filters/FilterMenu'
import { OpportunityTable } from '@/app/features/opportunities/OpportunityTable'
import { useOpportunityMutations } from '@/app/hooks/useOpportunityMutations'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { getSharedOpportunities } from '@/app/services/opportunities'
import { queryKeys } from '@/app/services/queryKeys'
import type { SortState } from '@/app/types'
import type { OpportunitySortKey } from '@/app/utils/opportunity'

const CATEGORY_OPTIONS: FilterOption<'any' | 'commercial' | 'government'>[] = [
  { value: 'any', label: 'All categories' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'government', label: 'Government' },
]

/**
 * Handpicked opportunities shared by OpportunityX admin for this workspace.
 * Radar-discovered hiring/tenders stay on Opportunities; curated rows live here.
 */
export function VendorsPage() {
  const navigate = useNavigate()
  const { id: openId } = useParams()
  const [searchParams] = useSearchParams()
  const { user } = useCurrentUser()
  const { assign } = useOpportunityMutations()

  const temperature = useMemo(() => {
    const raw = searchParams.get('temperature')
    if (!raw) return undefined
    const parts = raw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    return parts.length ? parts : undefined
  }, [searchParams])

  const [category, setCategory] = useState<'any' | 'commercial' | 'government'>('any')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sort, setSort] = useState<SortState<OpportunitySortKey>>({
    key: 'detectedAt',
    direction: 'desc',
  })

  const shared = useQuery({
    queryKey: [
      ...queryKeys.sharedOpportunities(category === 'any' ? undefined : category),
      page,
      pageSize,
      temperature ?? null,
    ],
    queryFn: () =>
      getSharedOpportunities({
        category: category === 'any' ? undefined : category,
        temperature,
        page,
        pageSize,
      }),
  })

  const rows = shared.data?.items ?? []
  const total = shared.data?.total ?? 0

  const subtitle = temperature?.includes('very_hot')
    ? 'Very Hot handpicked opportunities shared with your workspace.'
    : 'Handpicked opportunities from OpportunityX — original sources shared with your workspace after Radar unlocks them.'

  return (
    <div className="space-y-5">
      <PageHeader title="Vendors" subtitle={subtitle} />

      <div className="flex flex-wrap items-center gap-2">
        <SingleSelectFilter
          label="Category"
          options={CATEGORY_OPTIONS}
          value={category === 'any' ? undefined : category}
          anyValue="any"
          onChange={(next) => {
            setCategory((next as 'commercial' | 'government' | undefined) ?? 'any')
            setPage(1)
          }}
        />
      </div>

      <Panel flush>
        <OpportunityTable
          rows={rows}
          currentUserId={user.id}
          columns={[
            'title',
            'type',
            'temperature',
            'detectedAt',
            'deadline',
            'outreachStatus',
            'assignedToName',
          ]}
          isLoading={shared.isLoading}
          isError={shared.isError}
          assigningId={assign.isPending ? assign.variables?.opportunityId : null}
          onRetry={() => void shared.refetch()}
          sort={sort}
          onSortChange={setSort}
          activeRowKey={openId ?? null}
          onRowClick={(opportunity) =>
            navigate({ pathname: `/app/vendors/${opportunity.id}`, search: window.location.search })
          }
          onAssign={(opportunity, assignee) =>
            assign.mutate({ opportunityId: opportunity.id, assignee })
          }
          emptyState={
            <EmptyState
              icon={<Building2 />}
              title={
                temperature?.includes('very_hot')
                  ? 'No Very Hot vendor opportunities'
                  : 'No shared opportunities yet'
              }
              description={
                temperature?.includes('very_hot')
                  ? 'No admin-shared Very Hot opportunities are unlocked for this workspace yet.'
                  : 'When OpportunityX shares handpicked opportunities with your workspace, they appear here after a successful Radar run.'
              }
            />
          }
        />
        {!shared.isLoading && !shared.isError && rows.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
            itemLabel="opportunities"
          />
        )}
      </Panel>

      <Outlet />
    </div>
  )
}

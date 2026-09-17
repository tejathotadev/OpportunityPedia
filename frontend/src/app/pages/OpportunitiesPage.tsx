import { useQuery } from '@tanstack/react-query'
import { Building2, Radar } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'

import { EmptyState } from '@/app/components/feedback/States'
import { PageHeader } from '@/app/components/layout/PageHeader'
import { Panel } from '@/app/components/layout/Panel'
import { Pagination } from '@/app/components/tables/Pagination'
import {
  OPPORTUNITY_LANE_LABEL,
  OPPORTUNITY_LANES,
} from '@/app/constants/opportunity'
import { CompanyOpportunityTable } from '@/app/features/opportunities/CompanyOpportunityTable'
import { OpportunityFilterBar } from '@/app/features/opportunities/OpportunityFilterBar'
import { OpportunityTable } from '@/app/features/opportunities/OpportunityTable'
import { useOpportunityQueryState } from '@/app/features/opportunities/useOpportunityQueryState'
import { EmailComposer } from '@/app/features/outreach/EmailComposer'
import { CompanyHiringFilterDialog } from '@/app/features/outreach/CompanyHiringFilterDialog'
import { useOpportunityMutations } from '@/app/hooks/useOpportunityMutations'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import {
  getOpportunities,
  getOpportunityCompanies,
  type CompanySortKey,
} from '@/app/services/opportunities'
import { queryKeys } from '@/app/services/queryKeys'
import type { Opportunity, OpportunityCompanyRow, SortState } from '@/app/types'
import { isFilterEmpty } from '@/app/utils/opportunity'
import type { OpportunitySortKey } from '@/app/utils/opportunity'
import { cn } from '@/shared/cn'

export function OpportunitiesPage() {
  const navigate = useNavigate()
  const { id: openId } = useParams()
  const { user } = useCurrentUser()
  const { assign } = useOpportunityMutations()
  const [filterCompany, setFilterCompany] = useState<OpportunityCompanyRow | null>(null)
  const [companyOutreach, setCompanyOutreach] = useState<Opportunity | null>(null)

  const {
    lane,
    setLane,
    filters,
    sort,
    page,
    pageSize,
    apply,
    setSort,
    setPage,
    setPageSize,
    clearAll,
  } = useOpportunityQueryState()

  const isGovernment = lane === 'government'
  // Commercial is company-only — openings are never listed in the product UI.
  const showCompanyIndex = !isGovernment
  const showFlatList = isGovernment

  const companies = useQuery({
    queryKey: queryKeys.opportunityCompanies(filters, sort, page, pageSize),
    queryFn: () =>
      getOpportunityCompanies({
        filters,
        sort: sort as SortState<CompanySortKey>,
        page,
        pageSize,
      }),
    enabled: showCompanyIndex,
  })

  const openings = useQuery({
    queryKey: queryKeys.opportunities(filters, sort, page, pageSize),
    queryFn: () => getOpportunities({ filters, sort, page, pageSize }),
    enabled: showFlatList,
  })

  const companyRows = companies.data?.items ?? []
  const openingRows = openings.data?.items ?? []

  const openOpportunity = (id: string) => {
    navigate({ pathname: `/app/opportunities/${id}`, search: window.location.search })
  }

  const startCompanyOutreach = (row: OpportunityCompanyRow) => {
    setFilterCompany(row)
  }

  const subtitle = isGovernment
    ? 'Government tenders and procurement notices discovered by Radar.'
    : 'Commercial companies with hiring activity discovered by Radar.'

  const filterMode = isGovernment ? 'tenders' : 'companies'

  return (
    <div className="space-y-5">
      <PageHeader title="Opportunities" subtitle={subtitle} />

      <div
        role="group"
        aria-label="Opportunity lane"
        className="flex flex-wrap items-center gap-1.5"
      >
        {OPPORTUNITY_LANES.map((value) => {
          const active = value === lane
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setLane(value)}
              className={cn(
                'inline-flex h-8 items-center rounded-md border px-3 text-[13px] font-medium transition-colors',
                active
                  ? 'border-signal-600 bg-signal-600 text-white'
                  : 'border-line-strong bg-surface text-ink-secondary hover:bg-surface-sunken hover:text-ink',
              )}
            >
              {OPPORTUNITY_LANE_LABEL[value]}
            </button>
          )
        })}
      </div>

      <Panel flush>
        <OpportunityFilterBar
          filters={filters}
          mode={filterMode}
          onChange={(next) => apply({ ...next, type: filters.type, companyId: undefined })}
        />

        {showFlatList ? (
          <>
            <OpportunityTable
              rows={openingRows}
              currentUserId={user.id}
              isLoading={openings.isLoading}
              isError={openings.isError}
              assigningId={assign.isPending ? assign.variables?.opportunityId : null}
              onRetry={() => void openings.refetch()}
              sort={sort as SortState<OpportunitySortKey>}
              onSortChange={setSort}
              activeRowKey={openId ?? null}
              onRowClick={(opportunity) => openOpportunity(opportunity.id)}
              onAssign={(opportunity, assignee) =>
                assign.mutate({ opportunityId: opportunity.id, assignee })
              }
              emptyState={
                <EmptyState
                  icon={<Radar />}
                  title="No government opportunities match these filters."
                  description="Try clearing filters or widening the detected window."
                  action={{ label: 'Clear filters', onClick: clearAll }}
                />
              }
            />
            {!openings.isLoading && !openings.isError && openingRows.length > 0 && (
              <Pagination
                page={page}
                pageSize={pageSize}
                total={openings.data?.total ?? 0}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="opportunities"
              />
            )}
          </>
        ) : (
          <>
            <CompanyOpportunityTable
              rows={companyRows}
              currentUserId={user.id}
              isLoading={companies.isLoading}
              isError={companies.isError}
              assigningId={assign.isPending ? assign.variables?.opportunityId : null}
              onRetry={() => void companies.refetch()}
              sort={sort as SortState<CompanySortKey>}
              onSortChange={(next) => setSort(next as SortState<OpportunitySortKey>)}
              onRowClick={startCompanyOutreach}
              onAssign={(row, assignee) =>
                assign.mutate({ opportunityId: `company:${row.companyId}`, assignee })
              }
              emptyState={
                isFilterEmpty({ ...filters, type: undefined, companyId: undefined }) ? (
                  <EmptyState
                    icon={<Building2 />}
                    title="No commercial companies yet"
                    description="Companies appear here as commercial hiring activity is discovered. Handpicked admin signals are on Vendors."
                  />
                ) : (
                  <EmptyState
                    icon={<Building2 />}
                    title="No companies match these filters."
                    description="Try a broader title match or detected window."
                    action={{ label: 'Clear filters', onClick: clearAll }}
                  />
                )
              }
            />
            {!companies.isLoading && !companies.isError && companyRows.length > 0 && (
              <Pagination
                page={page}
                pageSize={pageSize}
                total={companies.data?.total ?? 0}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="companies"
              />
            )}
          </>
        )}
      </Panel>

      <Outlet />

      <CompanyHiringFilterDialog
        company={filterCompany}
        open={Boolean(filterCompany)}
        onOpenChange={(next) => {
          if (!next) setFilterCompany(null)
        }}
        onContinue={(opportunity) => {
          setFilterCompany(null)
          setCompanyOutreach(opportunity)
        }}
      />

      {companyOutreach && (
        <EmailComposer
          opportunity={companyOutreach}
          open
          onOpenChange={(open) => {
            if (!open) setCompanyOutreach(null)
          }}
        />
      )}
    </div>
  )
}

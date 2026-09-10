import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Button } from '@/app/components/common/Button'
import { Dialog } from '@/app/components/common/Dialog'
import { EmptyState, ErrorState, ListSkeleton } from '@/app/components/feedback/States'
import {
  MultiSelectFilter,
  type FilterOption,
} from '@/app/components/filters/FilterMenu'
import { getCompanyHiringSignal } from '@/app/services/opportunities'
import { queryKeys } from '@/app/services/queryKeys'
import type {
  CompanyHiringFacetBucket,
  Opportunity,
  OpportunityCompanyRow,
} from '@/app/types'

interface CompanyHiringFilterDialogProps {
  company: OpportunityCompanyRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: (opportunity: Opportunity) => void
}

function toOptions(buckets: CompanyHiringFacetBucket[]): FilterOption<string>[] {
  return buckets.map((bucket) => ({
    value: bucket.name,
    label: bucket.name,
    count: bucket.count,
  }))
}

function keepKnown(selected: string[], buckets: CompanyHiringFacetBucket[]): string[] {
  if (!selected.length) return selected
  const allowed = new Set(buckets.map((bucket) => bucket.name))
  const next = selected.filter((value) => allowed.has(value))
  if (next.length === selected.length && next.every((value, index) => value === selected[index])) {
    return selected
  }
  return next
}

function summarizeSelection(values: string[], emptyLabel: string): string {
  if (!values.length) return emptyLabel
  if (values.length === 1) return values[0]
  return `${values[0]} +${values.length - 1}`
}

export function CompanyHiringFilterDialog({
  company,
  open,
  onOpenChange,
  onContinue,
}: CompanyHiringFilterDialogProps) {
  const [teams, setTeams] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [flexibilities, setFlexibilities] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setTeams([])
    setLocations([])
    setFlexibilities([])
  }, [open, company?.companyId])

  const signal = useQuery({
    queryKey: queryKeys.companyHiringSignal(company?.companyId ?? '', {
      teams,
      locations,
      flexibilities,
    }),
    queryFn: () =>
      getCompanyHiringSignal(company!.companyId, {
        teams,
        locations,
        flexibilities,
      }),
    enabled: open && Boolean(company?.companyId),
    placeholderData: (previous) => previous,
  })

  const facets = signal.data?.facets
  const teamBuckets = facets?.teams ?? []
  const locationBuckets = facets?.locations ?? []
  const flexBuckets = facets?.flexibilities ?? []

  // Drop facet values that no longer apply after another filter changes
  // (e.g. a location with 0 roles under the selected team).
  useEffect(() => {
    if (!facets) return
    setTeams((prev) => keepKnown(prev, facets.teams))
    setLocations((prev) => keepKnown(prev, facets.locations))
    setFlexibilities((prev) => keepKnown(prev, facets.flexibilities))
  }, [facets])

  const matched = signal.data?.matchedCount ?? 0
  const total = signal.data?.totalCount ?? company?.matchingCount ?? 0
  const hasFilters = teams.length + locations.length + flexibilities.length > 0

  const filterSummary = [
    teams.length ? summarizeSelection(teams, '') : null,
    locations.length ? summarizeSelection(locations, '') : null,
    flexibilities.length ? summarizeSelection(flexibilities, '') : null,
  ].filter(Boolean)

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Focus outreach"
      description={
        company ? (
          <span className="block">
            Narrow openings at{' '}
            <span className="font-medium text-ink-secondary">{company.companyName}</span>, then
            continue to email with the matching count — not a job list.
          </span>
        ) : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!signal.data?.opportunity || matched < 1 || signal.isFetching}
            onClick={() => {
              if (!signal.data?.opportunity) return
              onContinue(signal.data.opportunity)
            }}
          >
            Continue to email
          </Button>
        </>
      }
    >
      {signal.isLoading && !signal.data ? (
        <ListSkeleton rows={4} />
      ) : signal.isError && !signal.data ? (
        <ErrorState
          title="Could not load hiring filters"
          description="Try again in a moment."
          onRetry={() => void signal.refetch()}
        />
      ) : !signal.data ? (
        <EmptyState
          title="No hiring signal"
          description="This company has no openings in the current scan."
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-md border border-line bg-surface-sunken px-4 py-4 text-center">
            <p className="nums text-[28px] font-semibold tracking-tight text-ink">
              {matched}
              <span className="ml-2 text-[14px] font-medium text-ink-muted">
                of {total} open roles
              </span>
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              {hasFilters
                ? `Showing openings matching ${filterSummary.join(' · ')}`
                : 'All openings — use the filters below to narrow'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MultiSelectFilter
              label="Team"
              options={toOptions(teamBuckets)}
              selected={teams}
              onChange={setTeams}
              searchable={teamBuckets.length > 8}
            />
            {locationBuckets.length > 0 && (
              <MultiSelectFilter
                label="Where you work"
                options={toOptions(locationBuckets)}
                selected={locations}
                onChange={setLocations}
                searchable={locationBuckets.length > 6}
                wide
              />
            )}
            {flexBuckets.length > 0 && (
              <MultiSelectFilter
                label="Work flexibility"
                options={toOptions(flexBuckets)}
                selected={flexibilities}
                onChange={setFlexibilities}
              />
            )}
          </div>

          {hasFilters && (
            <button
              type="button"
              className="text-[12.5px] font-medium text-signal-700 hover:text-signal-800"
              onClick={() => {
                setTeams([])
                setLocations([])
                setFlexibilities([])
              }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}
    </Dialog>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/app/components/common/Button'
import { Dialog } from '@/app/components/common/Dialog'
import { EmptyState, ErrorState, ListSkeleton } from '@/app/components/feedback/States'
import {
  MultiSelectFilter,
  type FilterOption,
} from '@/app/components/filters/FilterMenu'
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'
import { getCompanyHiringSignal } from '@/app/services/opportunities'
import { queryKeys } from '@/app/services/queryKeys'
import type {
  CompanyHiringFacetBucket,
  CompanyHiringSignal,
  Opportunity,
  OpportunityCompanyRow,
} from '@/app/types'
import { cn } from '@/shared/cn'

interface CompanyHiringFilterDialogProps {
  company: OpportunityCompanyRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: (opportunity: Opportunity) => void
}

type HiringFacetFilters = {
  teams: string[]
  locations: string[]
  flexibilities: string[]
}

const EMPTY_FILTERS: HiringFacetFilters = {
  teams: [],
  locations: [],
  flexibilities: [],
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
}

function normalizeFilters(filters: HiringFacetFilters): HiringFacetFilters {
  return {
    teams: sortedUnique(filters.teams),
    locations: sortedUnique(filters.locations),
    flexibilities: sortedUnique(filters.flexibilities),
  }
}

function filtersEqual(a: HiringFacetFilters, b: HiringFacetFilters): boolean {
  return (
    a.teams.length === b.teams.length &&
    a.locations.length === b.locations.length &&
    a.flexibilities.length === b.flexibilities.length &&
    a.teams.every((v, i) => v === b.teams[i]) &&
    a.locations.every((v, i) => v === b.locations[i]) &&
    a.flexibilities.every((v, i) => v === b.flexibilities[i])
  )
}

function toOptions(buckets: CompanyHiringFacetBucket[]): FilterOption<string>[] {
  return [...buckets]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((bucket) => ({
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

function summarizeSelection(values: string[]): string | null {
  if (!values.length) return null
  if (values.length === 1) return values[0]
  return `${values[0]} +${values.length - 1}`
}

function selectionSummary(filters: HiringFacetFilters): string {
  return [
    summarizeSelection(filters.teams),
    summarizeSelection(filters.locations),
    summarizeSelection(filters.flexibilities),
  ]
    .filter(Boolean)
    .join(' · ')
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

  const companyId = company?.companyId ?? ''

  useEffect(() => {
    if (!open) return
    setTeams([])
    setLocations([])
    setFlexibilities([])
  }, [open, companyId])

  const liveFilters = useMemo(
    () => normalizeFilters({ teams, locations, flexibilities }),
    [teams, locations, flexibilities],
  )
  const debouncedFilters = useDebouncedValue(liveFilters, 200)
  const hasFilters =
    liveFilters.teams.length + liveFilters.locations.length + liveFilters.flexibilities.length > 0
  const queryFilters = open ? (hasFilters ? debouncedFilters : EMPTY_FILTERS) : EMPTY_FILTERS
  const filtersPending = hasFilters && !filtersEqual(liveFilters, debouncedFilters)

  const signal = useQuery({
    queryKey: queryKeys.companyHiringSignal(companyId, queryFilters),
    queryFn: () => getCompanyHiringSignal(companyId, queryFilters),
    enabled: open && Boolean(companyId),
    staleTime: 60_000,
    placeholderData: (previous, previousQuery) => {
      const prevId = previousQuery?.queryKey?.[2]
      if (prevId === companyId && previous) return previous
      return undefined
    },
  })

  const data = signal.data as CompanyHiringSignal | undefined
  const facets = data?.facets
  const teamOptions = useMemo(() => toOptions(facets?.teams ?? []), [facets?.teams])
  const locationOptions = useMemo(() => toOptions(facets?.locations ?? []), [facets?.locations])
  const flexOptions = useMemo(
    () => toOptions(facets?.flexibilities ?? []),
    [facets?.flexibilities],
  )

  useEffect(() => {
    if (!facets) return
    setTeams((prev) => keepKnown(prev, facets.teams))
    setLocations((prev) => keepKnown(prev, facets.locations))
    setFlexibilities((prev) => keepKnown(prev, facets.flexibilities))
  }, [facets])

  const matched = data?.matchedCount ?? 0
  const total = data?.totalCount ?? company?.matchingCount ?? 0
  const summary = selectionSummary(liveFilters)
  const countUpdating = signal.isFetching || filtersPending
  const canSend =
    Boolean(data?.opportunity) && matched >= 1 && !filtersPending && !signal.isFetching
  const zeroMatch = Boolean(data) && hasFilters && matched < 1 && !countUpdating

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={company?.companyName ?? 'Focus outreach'}
      description="Narrow openings by team, location, or flexibility — then send outreach."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canSend}
            onClick={() => {
              if (!data?.opportunity || !canSend) return
              onContinue(data.opportunity)
            }}
          >
            Send Outreach
          </Button>
        </>
      }
    >
      {signal.isLoading && !data ? (
        <ListSkeleton rows={3} />
      ) : signal.isError && !data ? (
        <ErrorState
          title="Could not load hiring filters"
          description="Try again in a moment."
          onRetry={() => void signal.refetch()}
        />
      ) : !data ? (
        <EmptyState
          title="No hiring signal"
          description="This company has no openings in the current scan."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3 border-b border-line pb-3">
            <div className="min-w-0">
              <p
                className={cn(
                  'nums text-[22px] font-semibold tracking-tight text-ink transition-opacity',
                  countUpdating && 'opacity-60',
                )}
              >
                {matched}
                <span className="ml-1.5 text-[13px] font-medium text-ink-muted">
                  of {total} open roles
                </span>
              </p>
              <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                {hasFilters && summary ? `Matching ${summary}` : 'All openings at this company'}
              </p>
            </div>
            {countUpdating && (
              <span className="shrink-0 text-[12px] text-ink-subtle">Updating…</span>
            )}
          </div>

          <div>
            <p className="mb-2 text-[11.5px] font-semibold tracking-[0.04em] text-ink-subtle uppercase">
              Narrow by
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <MultiSelectFilter
                label="Team"
                options={teamOptions}
                selected={teams}
                onChange={setTeams}
                searchable={teamOptions.length > 8}
              />
              {locationOptions.length > 0 && (
                <MultiSelectFilter
                  label="Where you work"
                  options={locationOptions}
                  selected={locations}
                  onChange={setLocations}
                  searchable={locationOptions.length > 6}
                  wide
                />
              )}
              {flexOptions.length > 0 && (
                <MultiSelectFilter
                  label="Work flexibility"
                  options={flexOptions}
                  selected={flexibilities}
                  onChange={setFlexibilities}
                />
              )}
            </div>
          </div>

          {zeroMatch && (
            <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-[12.5px] text-ink-secondary">
              No roles match this selection. Clear a filter to widen the match.
            </p>
          )}

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
              Clear selection
            </button>
          )}
        </div>
      )}
    </Dialog>
  )
}

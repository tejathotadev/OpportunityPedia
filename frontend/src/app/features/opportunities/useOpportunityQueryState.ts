import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  OPPORTUNITY_LANE_TYPES,
  type OpportunityLane,
} from '@/app/constants/opportunity'
import type {
  OpportunityFilters,
  OpportunityTemperature,
  SortState,
} from '@/app/types'
import type { OpportunitySortKey } from '@/app/utils/opportunity'

const DEFAULT_SORT: SortState<OpportunitySortKey> = { key: 'detectedAt', direction: 'desc' }

function readList<T extends string>(value: string | null): T[] | undefined {
  if (!value) return undefined
  const items = value.split(',').filter(Boolean) as T[]
  return items.length ? items : undefined
}

function writeList(value?: string[]): string | undefined {
  return value?.length ? value.join(',') : undefined
}

function readLane(raw: string | null): OpportunityLane {
  return raw === 'government' ? 'government' : 'hiring'
}

/**
 * Filters, sorting and pagination live in the URL so a filtered list can be
 * shared, bookmarked and linked to from the dashboard.
 */
export function useOpportunityQueryState() {
  const [searchParams, setSearchParams] = useSearchParams()

  const lane = useMemo(() => readLane(searchParams.get('lane')), [searchParams])

  const filters = useMemo<OpportunityFilters>(() => {
    const detected = searchParams.get('detected')
    const deadline = searchParams.get('deadline')
    return {
      search: searchParams.get('q') ?? undefined,
      titleMatch: searchParams.get('title') ?? undefined,
      temperature: readList<OpportunityTemperature>(searchParams.get('temperature')),
      // Lane owns the type set so Hiring / Government never mix.
      type: OPPORTUNITY_LANE_TYPES[lane],
      industry: readList(searchParams.get('industry')),
      country: readList(searchParams.get('country')),
      companyId: undefined, // Commercial never drills into openings.
      detectedWithinDays: detected ? Number(detected) : undefined,
      deadlineWithinDays: deadline ? Number(deadline) : undefined,
    }
  }, [searchParams, lane])

  const sort = useMemo<SortState<OpportunitySortKey>>(() => {
    const key = searchParams.get('sort') as OpportunitySortKey | null
    const direction = searchParams.get('dir')
    if (!key) return DEFAULT_SORT
    return { key, direction: direction === 'asc' ? 'asc' : 'desc' }
  }, [searchParams])

  const page = Number(searchParams.get('page') ?? '1')
  const pageSize = Number(searchParams.get('pageSize') ?? '25')

  const apply = useCallback(
    (next: OpportunityFilters, options: { resetPage?: boolean } = {}) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          const set = (key: string, value?: string) => {
            if (value === undefined || value === '') params.delete(key)
            else params.set(key, value)
          }

          set('q', next.search)
          set('title', next.titleMatch)
          set('temperature', writeList(next.temperature))
          params.delete('type')
          set('industry', writeList(next.industry))
          set('country', writeList(next.country))
          set('company', next.companyId)
          set('detected', next.detectedWithinDays ? String(next.detectedWithinDays) : undefined)
          set('deadline', next.deadlineWithinDays ? String(next.deadlineWithinDays) : undefined)

          if (options.resetPage !== false) params.delete('page')

          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setLane = useCallback(
    (next: OpportunityLane) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (next === 'hiring') params.delete('lane')
          else params.set('lane', next)
          if (next === 'government') params.delete('company')
          params.delete('page')
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setSort = useCallback(
    (nextSort: SortState<OpportunitySortKey>) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          params.set('sort', nextSort.key)
          params.set('dir', nextSort.direction)
          params.delete('page')
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (nextPage <= 1) params.delete('page')
          else params.set('page', String(nextPage))
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setPageSize = useCallback(
    (nextSize: number) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          params.set('pageSize', String(nextSize))
          params.delete('page')
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearAll = useCallback(() => {
    setSearchParams(
      (current) => {
        const laneValue = current.get('lane')
        const params = new URLSearchParams()
        if (laneValue === 'government') params.set('lane', 'government')
        return params
      },
      { replace: true },
    )
  }, [setSearchParams])

  return {
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
  }
}

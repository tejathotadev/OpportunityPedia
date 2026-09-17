import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  FilterChip,
  SingleSelectFilter,
  type FilterOption,
} from '@/app/components/filters/FilterMenu'
import { TextInput } from '@/app/components/forms/Field'
import {
  COUNTRY_FILTER_LABEL,
  COUNTRY_FILTERS,
  DETECTED_RANGE_LABEL,
  DETECTED_RANGES,
  type CountryFilter,
  type DetectedRange,
} from '@/app/constants/opportunity'
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'
import type { OpportunityFilters } from '@/app/types'
import { countActiveFilters } from '@/app/utils/opportunity'

interface OpportunityFilterBarProps {
  filters: OpportunityFilters
  /** Display name for `filters.companyId`, which is an opaque token. */
  companyName?: string
  /** When browsing companies (no company scoped), search is company name. */
  mode?: 'companies' | 'openings' | 'tenders'
  onChange: (filters: OpportunityFilters) => void
}

const DETECTED_OPTIONS: FilterOption<string>[] = DETECTED_RANGES.map((value) => ({
  value,
  label: DETECTED_RANGE_LABEL[value],
}))

const COUNTRY_OPTIONS: FilterOption<string>[] = COUNTRY_FILTERS.map((value) => ({
  value,
  label: COUNTRY_FILTER_LABEL[value],
}))

const DEADLINE_OPTIONS: FilterOption<string>[] = [
  { value: 'any', label: 'Any deadline' },
  { value: '7', label: 'Within 7 days' },
  { value: '14', label: 'Within 14 days' },
  { value: '30', label: 'Within 30 days' },
]

export function OpportunityFilterBar({
  filters,
  companyName,
  mode = 'companies',
  onChange,
}: OpportunityFilterBarProps) {
  const showTitleMatch = mode === 'openings'
  const showDeadline = mode === 'openings' || mode === 'tenders'

  const [term, setTerm] = useState(filters.search ?? '')
  const [titleTerm, setTitleTerm] = useState(filters.titleMatch ?? '')
  const debouncedTerm = useDebouncedValue(term, 250)
  const debouncedTitle = useDebouncedValue(titleTerm, 250)

  useEffect(() => {
    setTerm(filters.search ?? '')
  }, [filters.search])

  useEffect(() => {
    setTitleTerm(filters.titleMatch ?? '')
  }, [filters.titleMatch])

  // Commercial no longer exposes title match — drop any stale URL value.
  useEffect(() => {
    if (mode === 'companies' && filters.titleMatch) {
      onChange({ ...filters, titleMatch: undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    if ((filters.search ?? '') !== debouncedTerm) {
      onChange({ ...filters, search: debouncedTerm || undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm])

  useEffect(() => {
    if (!showTitleMatch) return
    if ((filters.titleMatch ?? '') !== debouncedTitle) {
      onChange({ ...filters, titleMatch: debouncedTitle || undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTitle, showTitleMatch])

  const update = (patch: Partial<OpportunityFilters>) => onChange({ ...filters, ...patch })
  const activeCount = countActiveFilters({
    ...filters,
    type: undefined,
    temperature: undefined,
    titleMatch: showTitleMatch ? filters.titleMatch : undefined,
  })

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = []
  if (showTitleMatch && filters.titleMatch?.trim()) {
    chips.push({
      key: 'title',
      label: `Title match: ${filters.titleMatch.trim()}`,
      onRemove: () => update({ titleMatch: undefined }),
    })
  }
  if (filters.search?.trim()) {
    chips.push({
      key: 'search',
      label: `Search: ${filters.search.trim()}`,
      onRemove: () => {
        setTerm('')
        update({ search: undefined })
      },
    })
  }
  if (filters.companyId) {
    chips.push({
      key: 'company',
      label: `Company: ${companyName ?? 'Selected'}`,
      onRemove: () => update({ companyId: undefined }),
    })
  }
  filters.country?.forEach((value) =>
    chips.push({
      key: `country-${value}`,
      label: `Location: ${COUNTRY_FILTER_LABEL[value as CountryFilter] ?? value}`,
      onRemove: () => update({ country: filters.country?.filter((item) => item !== value) }),
    }),
  )
  if (filters.detectedWithinDays) {
    const preset = DETECTED_RANGE_LABEL[String(filters.detectedWithinDays) as DetectedRange]
    chips.push({
      key: 'detected',
      label: `Detected: ${preset ?? `last ${filters.detectedWithinDays} days`}`,
      onRemove: () => update({ detectedWithinDays: undefined }),
    })
  }
  if (showDeadline && filters.deadlineWithinDays) {
    chips.push({
      key: 'deadline',
      label: `Deadline within ${filters.deadlineWithinDays} days`,
      onRemove: () => update({ deadlineWithinDays: undefined }),
    })
  }

  const searchPlaceholder =
    mode === 'companies'
      ? 'Search companies'
      : mode === 'tenders'
        ? 'Search tenders'
        : 'Search openings'

  function clearFilters() {
    setTerm('')
    setTitleTerm('')
    onChange({
      type: filters.type,
      companyId: undefined,
      search: undefined,
      titleMatch: undefined,
      temperature: undefined,
      industry: undefined,
      country: undefined,
      detectedWithinDays: undefined,
      deadlineWithinDays: undefined,
    })
  }

  return (
    <div className="border-b border-line">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        {showTitleMatch && (
          <div className="w-full sm:w-[15rem]">
            <TextInput
              value={titleTerm}
              onChange={(event) => setTitleTerm(event.target.value)}
              placeholder="Title match (e.g. engineer)"
              aria-label="Title match"
              iconLeft={<Search />}
              className="h-8"
            />
          </div>
        )}

        <div className="w-full min-w-[12rem] sm:w-[14rem] sm:flex-none">
          <TextInput
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            iconLeft={<Search />}
            className="h-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SingleSelectFilter
            label="Detected"
            options={DETECTED_OPTIONS}
            value={filters.detectedWithinDays ? String(filters.detectedWithinDays) : undefined}
            anyValue="any"
            onChange={(next) => update({ detectedWithinDays: next ? Number(next) : undefined })}
          />
          <SingleSelectFilter
            label="Location"
            options={COUNTRY_OPTIONS}
            value={filters.country?.[0]}
            anyValue="any"
            onChange={(next) => update({ country: next ? [next] : undefined })}
          />
          {showDeadline && (
            <SingleSelectFilter
              label="Deadline"
              options={DEADLINE_OPTIONS}
              value={filters.deadlineWithinDays ? String(filters.deadlineWithinDays) : undefined}
              anyValue="any"
              onChange={(next) => update({ deadlineWithinDays: next ? Number(next) : undefined })}
            />
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-2">
          <span className="text-[12px] text-ink-muted">
            {activeCount} active {activeCount === 1 ? 'filter' : 'filters'}
          </span>
          {chips.map((chip) => (
            <FilterChip key={chip.key} onRemove={chip.onRemove}>
              {chip.label}
            </FilterChip>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="ml-1 text-[12px] font-medium text-signal-700 underline-offset-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}

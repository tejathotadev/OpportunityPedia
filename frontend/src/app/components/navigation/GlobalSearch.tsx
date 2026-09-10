import * as Primitive from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { Clock, CornerDownLeft, Radar, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { TemperatureMark } from '@/app/components/badges/TemperatureBadge'
import { CompanyAvatar } from '@/app/components/common/Avatar'
import { opportunityDisplayType } from '@/app/constants/opportunity'
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'
import { globalSearch } from '@/app/services/search'
import { useUiStore } from '@/app/store/useUiStore'
import { cn } from '@/shared/cn'

interface ResultRow {
  id: string
  kind: 'opportunity' | 'company' | 'recent'
  to: string
  label: string
  meta: string
  temperature?: React.ReactNode
}

export function GlobalSearch() {
  const open = useUiStore((state) => state.searchOpen)
  const setOpen = useUiStore((state) => state.setSearchOpen)
  const recentSearches = useUiStore((state) => state.recentSearches)
  const addRecentSearch = useUiStore((state) => state.addRecentSearch)
  const clearRecentSearches = useUiStore((state) => state.clearRecentSearches)

  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const debounced = useDebouncedValue(term, 180)

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => globalSearch(debounced),
    enabled: open && debounced.trim().length > 0,
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTerm('')
      setActiveIndex(0)
    }
    setOpen(next)
  }

  const rows = useMemo<ResultRow[]>(() => {
    if (!debounced.trim()) {
      return recentSearches.map((item) => ({
        id: `recent-${item}`,
        kind: 'recent' as const,
        to: `/app/opportunities?q=${encodeURIComponent(item)}`,
        label: item,
        meta: 'Recent search',
      }))
    }
    const opportunities = (data?.opportunities ?? []).map((item) => ({
      id: item.id,
      kind: 'opportunity' as const,
      to: `/app/opportunities/${item.id}`,
      label: item.title,
      meta: `${item.companyName} · ${opportunityDisplayType(item)}`,
      temperature: <TemperatureMark temperature={item.temperature} />,
    }))
    const companies = (data?.companies ?? []).map((item) => ({
      id: item.id,
      kind: 'company' as const,
      to: `/app/opportunities?company=${encodeURIComponent(item.id)}`,
      label: item.name,
      meta: `${item.industry} · ${item.location}`,
    }))
    return [...opportunities, ...companies]
  }, [data, debounced, recentSearches])

  // Highlight the first hit whenever the result set changes, adjusted during
  // render rather than in an effect so the list never paints a stale selection.
  const [lastQuery, setLastQuery] = useState(debounced)
  if (lastQuery !== debounced) {
    setLastQuery(debounced)
    setActiveIndex(0)
  }

  const commit = (row: ResultRow) => {
    if (row.kind !== 'recent') addRecentSearch(term.trim() || row.label)
    handleOpenChange(false)
    navigate(row.to)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, rows.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const row = rows[activeIndex]
      if (row) commit(row)
    }
  }

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const grouped = useMemo(() => {
    const opportunities = rows.filter((row) => row.kind === 'opportunity')
    const companies = rows.filter((row) => row.kind === 'company')
    const recents = rows.filter((row) => row.kind === 'recent')
    return { opportunities, companies, recents }
  }, [rows])

  const renderRow = (row: ResultRow) => {
    const index = rows.indexOf(row)
    const isActive = index === activeIndex
    return (
      <button
        key={row.id}
        type="button"
        data-active={isActive}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => commit(row)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
          isActive ? 'bg-surface-sunken' : 'hover:bg-surface-muted',
        )}
      >
        {row.kind === 'company' ? (
          <CompanyAvatar name={row.label} size="sm" />
        ) : (
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-line bg-surface-sunken text-ink-muted">
            {row.kind === 'recent' ? (
              <Clock className="size-3.5" />
            ) : (
              <Radar className="size-3.5" />
            )}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-ink">{row.label}</span>
          <span className="block truncate text-[12.5px] text-ink-muted">{row.meta}</span>
        </span>
        {row.temperature}
        {isActive && <CornerDownLeft className="size-3.5 shrink-0 text-ink-subtle" aria-hidden />}
      </button>
    )
  }

  return (
    <Primitive.Root open={open} onOpenChange={handleOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="ox-anim-overlay fixed inset-0 z-50 bg-forest-950/35" />
        <Primitive.Content
          onKeyDown={handleKeyDown}
          className="ox-anim-dialog fixed top-1/2 left-1/2 z-50 flex max-h-[70vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-overlay"
        >
          <Primitive.Title className="sr-only">Search Opportunity Pedia</Primitive.Title>
          <Primitive.Description className="sr-only">
            Search companies, opportunities and vendors. Use arrow keys to navigate results.
          </Primitive.Description>

          <div className="flex items-center gap-2.5 border-b border-line px-3.5">
            <Search className="size-4 shrink-0 text-ink-subtle" aria-hidden />
            <input
              autoFocus
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search companies, opportunities, vendors..."
              aria-label="Search companies, opportunities, vendors"
              className="h-12 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
            />
            {term && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setTerm('')}
                className="inline-flex size-6 items-center justify-center rounded text-ink-subtle hover:bg-surface-sunken hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div ref={listRef} className="scrollbar-thin flex-1 overflow-y-auto p-2">
            {rows.length === 0 ? (
              <p className="px-2.5 py-8 text-center text-[13px] text-ink-muted">
                {debounced.trim()
                  ? isFetching
                    ? 'Searching…'
                    : `No matches for “${debounced}”`
                  : 'Search across opportunities, companies and vendors.'}
              </p>
            ) : (
              <>
                {grouped.recents.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1">
                      <p className="text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
                        Recent searches
                      </p>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-[11.5px] text-ink-muted hover:text-ink"
                      >
                        Clear
                      </button>
                    </div>
                    {grouped.recents.map(renderRow)}
                  </section>
                )}
                {grouped.opportunities.length > 0 && (
                  <section>
                    <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
                      Opportunities
                    </p>
                    {grouped.opportunities.map(renderRow)}
                  </section>
                )}
                {grouped.companies.length > 0 && (
                  <section>
                    <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold tracking-[0.05em] text-ink-subtle uppercase">
                      Companies
                    </p>
                    {grouped.companies.map(renderRow)}
                  </section>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-line bg-surface-muted px-3.5 py-2 text-[11.5px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↵</Kbd> open
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>esc</Kbd> close
            </span>
          </div>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-line-strong bg-surface px-1 font-sans text-[10.5px] text-ink-secondary">
      {children}
    </kbd>
  )
}

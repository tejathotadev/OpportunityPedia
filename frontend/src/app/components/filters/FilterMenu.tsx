import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '@/shared/cn'

export interface FilterOption<T extends string> {
  value: T
  label: string
  description?: string
  /** Shown as `(n)` after the label — careers-style facet counts. */
  count?: number
  /** Optional leading swatch, used for temperature. */
  dotClassName?: string
}

interface MultiSelectFilterProps<T extends string> {
  label: string
  options: FilterOption<T>[]
  selected: T[]
  onChange: (next: T[]) => void
  /** Adds a type-ahead field when the list is long. */
  searchable?: boolean
  align?: 'start' | 'end'
  /** Wider panel for long location labels. */
  wide?: boolean
}

export function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
  searchable,
  align = 'start',
  wide,
}: MultiSelectFilterProps<T>) {
  const [term, setTerm] = useState('')
  const visible = term
    ? options.filter((option) => option.label.toLowerCase().includes(term.toLowerCase()))
    : options

  const toggle = (value: T) => {
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    )
  }

  return (
    <Popover.Root onOpenChange={(open) => !open && setTerm('')}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors',
            selected.length > 0
              ? 'border-signal-200 bg-signal-50 text-signal-800'
              : 'border-line-strong bg-surface text-ink-secondary hover:bg-surface-sunken hover:text-ink',
          )}
        >
          {label}
          {selected.length > 0 && (
            <span className="nums inline-flex h-4 min-w-4 items-center justify-center rounded bg-signal-600 px-1 text-[10.5px] font-semibold text-white">
              {selected.length}
            </span>
          )}
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align={align}
          sideOffset={6}
          className={cn(
            'ox-anim-pop z-50 overflow-hidden rounded-lg border border-line bg-surface shadow-overlay',
            wide ? 'w-80' : 'w-64',
          )}
        >
          {searchable && (
            <div className="border-b border-line p-2">
              <input
                autoFocus
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder="Search"
                aria-label={`Search ${label}`}
                className="h-8 w-full rounded-md border border-line-strong px-2 text-[13px] text-ink placeholder:text-ink-subtle focus:border-signal-500 focus:ring-2 focus:ring-signal-600/20 focus:outline-none"
              />
            </div>
          )}

          <div className="scrollbar-thin max-h-64 overflow-y-auto p-1">
            {visible.length === 0 ? (
              <p className="px-2 py-4 text-center text-[12.5px] text-ink-muted">No matches</p>
            ) : (
              visible.map((option) => {
                const checked = selected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggle(option.value)}
                    aria-pressed={checked}
                    className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-sunken"
                  >
                    <span
                      className={cn(
                        'inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                        checked
                          ? 'border-signal-600 bg-signal-600 text-white'
                          : 'border-line-strong bg-surface',
                      )}
                    >
                      {checked && <Check className="size-3" aria-hidden />}
                    </span>
                    {option.dotClassName && (
                      <span className={cn('size-2 shrink-0 rounded-full', option.dotClassName)} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">
                        {option.label}
                        {typeof option.count === 'number' && (
                          <span className="nums text-ink-muted"> ({option.count})</span>
                        )}
                      </span>
                      {option.description && (
                        <span className="block truncate text-[11.5px] text-ink-muted">
                          {option.description}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="border-t border-line p-1">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-md px-2 py-1.5 text-left text-[12.5px] text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

interface SingleSelectFilterProps<T extends string> {
  label: string
  options: FilterOption<T>[]
  value?: T
  onChange: (next: T | undefined) => void
  /** Value that means "no filter"; rendered first and clears the selection. */
  anyValue: T
}

export function SingleSelectFilter<T extends string>({
  label,
  options,
  value,
  onChange,
  anyValue,
}: SingleSelectFilterProps<T>) {
  const active = value && value !== anyValue
  const activeLabel = options.find((option) => option.value === value)?.label

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors',
            active
              ? 'border-signal-200 bg-signal-50 text-signal-800'
              : 'border-line-strong bg-surface text-ink-secondary hover:bg-surface-sunken hover:text-ink',
          )}
        >
          {active ? `${label}: ${activeLabel}` : label}
          <ChevronDown className="size-3.5 opacity-60" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="ox-anim-pop z-50 w-56 overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-overlay"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value === anyValue ? undefined : option.value)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-sunken',
                value === option.value ? 'text-ink' : 'text-ink-secondary',
              )}
            >
              {option.label}
              {value === option.value && <Check className="size-3.5 text-signal-600" aria-hidden />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function FilterChip({
  children,
  onRemove,
}: {
  children: ReactNode
  onRemove: () => void
}) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-line-strong bg-surface pr-1 pl-2 text-[12px] text-ink-secondary">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="inline-flex size-4 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
          <path
            d="M2 2l8 8M10 2l-8 8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  )
}

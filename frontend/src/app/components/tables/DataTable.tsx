import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { ErrorState, TableSkeleton } from '@/app/components/feedback/States'
import type { SortDirection, SortState } from '@/app/types'
import { cn } from '@/shared/cn'

export interface DataTableColumn<T, TKey extends string = string> {
  key: TKey
  header: ReactNode
  render: (row: T) => ReactNode
  sortable?: boolean
  align?: 'left' | 'right'
  /** Tailwind width utility, e.g. `w-[220px]`. Keeps columns predictable. */
  width?: string
  /** Column is hidden below this breakpoint to protect readability. */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  headerClassName?: string
  cellClassName?: string
}

const HIDE_BELOW: Record<NonNullable<DataTableColumn<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
}

export interface DataTableProps<T, TKey extends string = string> {
  columns: DataTableColumn<T, TKey>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  /** Left rail color class used sparingly to mark urgent rows. */
  rowRail?: (row: T) => string | undefined
  activeRowKey?: string | null
  sort?: SortState<TKey>
  onSortChange?: (sort: SortState<TKey>) => void
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  emptyState?: ReactNode
  /** Stacked summary rendered instead of the table on small screens. */
  renderMobileCard?: (row: T) => ReactNode
  stickyHeader?: boolean
  className?: string
  skeletonRows?: number
}

function nextDirection(current: SortDirection | undefined): SortDirection {
  return current === 'asc' ? 'desc' : 'asc'
}

export function DataTable<T, TKey extends string = string>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowRail,
  activeRowKey,
  sort,
  onSortChange,
  isLoading,
  isError,
  onRetry,
  emptyState,
  renderMobileCard,
  stickyHeader = true,
  className,
  skeletonRows = 8,
}: DataTableProps<T, TKey>) {
  if (isError) {
    return (
      <ErrorState
        title="We couldn’t load this data."
        description="Check your connection and try again."
        onRetry={onRetry}
      />
    )
  }

  if (isLoading) {
    return <TableSkeleton rows={skeletonRows} columns={Math.min(columns.length, 7)} />
  }

  if (rows.length === 0) {
    return <>{emptyState}</>
  }

  const interactive = Boolean(onRowClick)

  return (
    <div className={className}>
      {renderMobileCard && (
        <ul className="divide-y divide-line md:hidden">
          {rows.map((row) => (
            <li key={rowKey(row)}>
              <button
                type="button"
                onClick={() => onRowClick?.(row)}
                className="w-full px-4 py-3 text-left transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted"
              >
                {renderMobileCard(row)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          'scrollbar-thin overflow-x-auto',
          renderMobileCard ? 'hidden md:block' : 'block',
        )}
      >
        {/* Fixed layout keeps truncated cells from forcing the table wider than
            the page; every column declares an explicit width. */}
        <table className="w-full table-fixed border-collapse text-left">
          <thead
            className={cn(
              'bg-surface-muted',
              stickyHeader && 'sticky top-0 z-10',
            )}
          >
            <tr className="border-b border-line">
              {columns.map((column) => {
                const isSorted = sort?.key === column.key
                const direction = isSorted ? sort?.direction : undefined
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.04em] text-ink-muted uppercase',
                      column.align === 'right' && 'text-right',
                      column.width,
                      column.hideBelow && HIDE_BELOW[column.hideBelow],
                      column.headerClassName,
                    )}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSortChange({
                            key: column.key,
                            direction: isSorted ? nextDirection(direction) : 'desc',
                          })
                        }
                        className={cn(
                          'inline-flex items-center gap-1 rounded uppercase transition-colors hover:text-ink',
                          column.align === 'right' && 'flex-row-reverse',
                          isSorted && 'text-ink',
                        )}
                      >
                        {column.header}
                        {isSorted ? (
                          direction === 'asc' ? (
                            <ArrowUp className="size-3" aria-hidden />
                          ) : (
                            <ArrowDown className="size-3" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const key = rowKey(row)
              const rail = rowRail?.(row)
              return (
                <tr
                  key={key}
                  onClick={interactive ? () => onRowClick?.(row) : undefined}
                  onKeyDown={
                    interactive
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick?.(row)
                          }
                        }
                      : undefined
                  }
                  tabIndex={interactive ? 0 : undefined}
                  className={cn(
                    'group relative bg-surface transition-colors duration-150',
                    interactive &&
                      'cursor-pointer hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none',
                    activeRowKey === key && 'bg-signal-50/60 hover:bg-signal-50/60',
                  )}
                >
                  {columns.map((column, columnIndex) => (
                    <td
                      key={column.key}
                      className={cn(
                        'relative px-4 py-2.5 align-middle text-[13.5px] text-ink-secondary',
                        column.align === 'right' && 'text-right',
                        column.hideBelow && HIDE_BELOW[column.hideBelow],
                        column.cellClassName,
                      )}
                    >
                      {columnIndex === 0 && rail && (
                        <span
                          aria-hidden
                          className={cn(
                            'absolute inset-y-0 left-0 w-[3px]',
                            rail,
                          )}
                        />
                      )}
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Select } from '@/app/components/forms/Field'
import { cn } from '@/shared/cn'
import { formatNumber } from '@/app/utils/format'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  /** Noun used in the result count, e.g. "opportunities". */
  itemLabel?: string
  className?: string
}

const PAGE_SIZES = [25, 50, 100]

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'results',
  className,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-line px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="nums text-[13px] text-ink-muted">
        {total === 0 ? (
          <>No {itemLabel}</>
        ) : (
          <>
            <span className="font-medium text-ink-secondary">
              {formatNumber(start)}–{formatNumber(end)}
            </span>{' '}
            of {formatNumber(total)} {itemLabel}
          </>
        )}
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-[13px] text-ink-muted">
            <span className="hidden sm:inline">Rows</span>
            <Select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 w-[72px] text-[13px]"
              aria-label="Rows per page"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-line-strong bg-surface text-ink-secondary transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="nums px-1.5 text-[13px] text-ink-muted">
            Page <span className="font-medium text-ink-secondary">{page}</span> of {pageCount}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex size-8 items-center justify-center rounded-md border border-line-strong bg-surface text-ink-secondary transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

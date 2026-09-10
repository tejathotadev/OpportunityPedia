import { CalendarClock } from 'lucide-react'

import { EmptyState, ErrorState, ListSkeleton } from '@/app/components/feedback/States'
import type { Opportunity } from '@/app/types'
import { cn } from '@/shared/cn'
import { formatDate, getDeadlineUrgency } from '@/app/utils/date'

interface UpcomingDeadlinesProps {
  rows: Opportunity[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onOpen: (opportunity: Opportunity) => void
}

export function UpcomingDeadlines({
  rows,
  isLoading,
  isError,
  onRetry,
  onOpen,
}: UpcomingDeadlinesProps) {
  if (isLoading) return <ListSkeleton rows={4} />

  // A failed request must not be reported as "no upcoming deadlines".
  if (isError) return <ErrorState compact onRetry={onRetry} />

  if (rows.length === 0) {
    return (
      <EmptyState
        compact
        icon={<CalendarClock />}
        title="No upcoming deadlines"
        description="Opportunities with published deadlines will appear here."
      />
    )
  }

  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => {
        const urgency = getDeadlineUrgency(row.deadline)
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">
                  {row.title}
                </span>
                <span className="block truncate text-[12.5px] text-ink-muted">
                  {row.companyName}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="nums block text-[13px] whitespace-nowrap text-ink">
                  {formatDate(row.deadline)}
                </span>
                {urgency && (
                  <span
                    className={cn('nums block text-[12px] whitespace-nowrap', urgency.className)}
                  >
                    {urgency.label}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

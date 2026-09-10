import { Radar } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { UserAvatar } from '@/app/components/common/Avatar'
import type { Opportunity, OpportunityActivity } from '@/app/types'
import { cn } from '@/shared/cn'
import { formatDateTimeFull, formatRelative } from '@/app/utils/date'

interface ActivityFeedProps {
  entries: OpportunityActivity[]
  /** Used to show which opportunity each entry belongs to. */
  opportunities?: Opportunity[]
  className?: string
}

/** Team-facing feed: who did what, on which opportunity, and when. */
export function ActivityFeed({ entries, opportunities = [], className }: ActivityFeedProps) {
  const navigate = useNavigate()

  const titleById = useMemo(
    () => new Map(opportunities.map((item) => [item.id, item.title])),
    [opportunities],
  )

  return (
    <ul className={cn('divide-y divide-line', className)}>
      {entries.map((entry) => {
        const title = titleById.get(entry.opportunityId)
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => navigate(`/app/opportunities/${entry.opportunityId}`)}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted"
            >
              {entry.actorId ? (
                <UserAvatar name={entry.actorName} size="md" />
              ) : (
                <span
                  aria-hidden
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-sunken text-ink-muted"
                >
                  <Radar className="size-4" />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] leading-snug text-ink">{entry.message}</span>
                {title && (
                  <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">{title}</span>
                )}
              </span>

              <span
                className="shrink-0 pt-0.5 text-[12px] whitespace-nowrap text-ink-subtle"
                title={formatDateTimeFull(entry.createdAt)}
              >
                {formatRelative(entry.createdAt)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

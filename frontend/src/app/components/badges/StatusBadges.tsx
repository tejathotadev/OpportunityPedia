import { opportunityDisplayType, outreachStatusMeta } from '@/app/constants/opportunity'
import type { OpportunityType, OutreachStatus } from '@/app/types'
import { cn } from '@/shared/cn'

import { Badge } from './Badge'
import { Tooltip } from '@/app/components/common/Tooltip'

export function OpportunityTypeBadge({
  type,
  noticeType,
  className,
}: {
  type: OpportunityType
  noticeType?: string | null
  className?: string
}) {
  const label = opportunityDisplayType({ type, noticeType })
  return (
    <Tooltip content={label}>
      <span className="block min-w-0 max-w-full">
        <Badge
          title={label}
          className={cn(
            'max-w-full bg-forest-50 text-forest-700 border-forest-100',
            className,
          )}
        >
          <span className="truncate">{label}</span>
        </Badge>
      </span>
    </Tooltip>
  )
}

export function OutreachStatusBadge({
  status,
  className,
}: {
  status: OutreachStatus
  className?: string
}) {
  const meta = outreachStatusMeta(status)
  // "Not contacted" is the resting state of most rows; a badge on every one of
  // them reads as noise, so it stays plain text and badges mark real progress.
  if (status === 'not_contacted') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink-muted',
          className,
        )}
      >
        <span className={cn('size-1.5 rounded-full', meta.dot)} aria-hidden />
        {meta.label}
      </span>
    )
  }
  return (
    <Badge className={cn(meta.badge, className)} dotClassName={meta.dot}>
      {meta.label}
    </Badge>
  )
}

export function AssignmentBadge({ assigned }: { assigned: boolean }) {
  return assigned ? (
    <Badge className="bg-forest-50 text-forest-700 border-forest-100">Assigned</Badge>
  ) : (
    <Badge className="bg-surface-sunken text-ink-muted border-line-strong">Unassigned</Badge>
  )
}

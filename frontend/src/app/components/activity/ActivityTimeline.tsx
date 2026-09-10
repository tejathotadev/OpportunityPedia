import {
  CircleDot,
  Flame,
  MessageSquare,
  Radar,
  Reply,
  RotateCcw,
  Send,
  StickyNote,
  UserCheck,
  UserMinus,
  type LucideIcon,
} from 'lucide-react'

import type { ActivityType, OpportunityActivity } from '@/app/types'
import { cn } from '@/shared/cn'
import { formatDateTimeFull, formatDateTimeShort, formatRelative } from '@/app/utils/date'

const ICONS: Record<ActivityType, LucideIcon> = {
  discovered: Radar,
  assigned: UserCheck,
  unassigned: UserMinus,
  reassigned: RotateCcw,
  contacted: Send,
  replied: Reply,
  follow_up: MessageSquare,
  completed: CircleDot,
  temperature_changed: Flame,
  note: StickyNote,
}

const TONES: Record<ActivityType, string> = {
  discovered: 'text-ink-muted border-line bg-surface',
  assigned: 'text-signal-700 border-signal-200 bg-signal-50',
  unassigned: 'text-ink-muted border-line bg-surface',
  reassigned: 'text-forest-700 border-forest-100 bg-forest-50',
  contacted: 'text-signal-700 border-signal-200 bg-signal-50',
  replied: 'text-success border-success-line bg-success-soft',
  follow_up: 'text-warm-strong border-warm-line bg-warm-soft',
  completed: 'text-success border-success-line bg-success-soft',
  temperature_changed: 'text-veryhot border-veryhot-line bg-veryhot-soft',
  note: 'text-ink-secondary border-line bg-surface',
}

interface ActivityTimelineProps {
  entries: OpportunityActivity[]
  className?: string
}

/** Flat timeline — no cards, so a long history stays readable. */
export function ActivityTimeline({ entries, className }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return <p className="py-6 text-[13px] text-ink-muted">No activity recorded yet.</p>
  }

  return (
    <ol className={cn('relative', className)}>
      <span aria-hidden className="absolute top-2 bottom-2 left-[13px] w-px bg-line" />
      {entries.map((entry) => {
        const Icon = ICONS[entry.type]
        return (
          <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
            <span
              className={cn(
                'relative z-10 mt-0.5 inline-flex size-[27px] shrink-0 items-center justify-center rounded-full border',
                TONES[entry.type],
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] leading-snug text-ink">{entry.message}</p>
              {entry.detail && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{entry.detail}</p>
              )}
              <p
                className="mt-1 text-[12px] text-ink-subtle"
                title={formatDateTimeFull(entry.createdAt)}
              >
                {formatDateTimeShort(entry.createdAt)}
                <span className="mx-1.5 text-line-strong">·</span>
                {formatRelative(entry.createdAt)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

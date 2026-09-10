import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/shared/cn'
import { formatNumber } from '@/app/utils/format'

interface StatCardProps {
  label: string
  value: number | string
  /** Factual comparison, e.g. "+48 this week". Omitted when there is no data. */
  context?: string
  contextTone?: 'neutral' | 'critical' | 'warning'
  icon?: LucideIcon
  /** Makes the whole card a shortcut into the matching filtered list. */
  to?: string
  accent?: 'none' | 'veryhot' | 'hot'
}

const CONTEXT_TONE = {
  neutral: 'text-ink-muted',
  critical: 'text-veryhot-strong',
  warning: 'text-hot-strong',
} as const

export function StatCard({
  label,
  value,
  context,
  contextTone = 'neutral',
  icon: Icon,
  to,
  accent = 'none',
}: StatCardProps) {
  const navigate = useNavigate()
  const interactive = Boolean(to)

  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium text-ink-muted">{label}</p>
        {Icon && (
          <Icon
            className={cn(
              'size-4 shrink-0',
              accent === 'veryhot'
                ? 'text-veryhot'
                : accent === 'hot'
                  ? 'text-hot'
                  : 'text-ink-subtle',
            )}
            aria-hidden
          />
        )}
      </div>
      <p className="nums mt-2 text-[26px] leading-none font-semibold text-ink">
        {typeof value === 'number' ? formatNumber(value) : value}
      </p>
      {context && (
        <p className={cn('nums mt-2 text-[12.5px]', CONTEXT_TONE[contextTone])}>{context}</p>
      )}
    </>
  )

  const base = cn(
    'relative rounded-lg border border-line bg-surface p-4 text-left',
    interactive &&
      'transition-colors duration-150 hover:border-line-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-600',
  )

  if (!interactive) {
    return <div className={base}>{content}</div>
  }

  return (
    <button type="button" onClick={() => navigate(to as string)} className={base}>
      {content}
    </button>
  )
}

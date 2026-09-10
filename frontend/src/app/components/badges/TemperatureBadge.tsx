import { temperatureMeta } from '@/app/constants/opportunity'
import type { OpportunityTemperature } from '@/app/types'
import { cn } from '@/shared/cn'

import { Badge } from './Badge'

interface TemperatureBadgeProps {
  temperature?: OpportunityTemperature | null
  size?: 'sm' | 'md'
  className?: string
}

/** Always renders the label — temperature must never rely on color alone. */
export function TemperatureBadge({ temperature, size = 'sm', className }: TemperatureBadgeProps) {
  const meta = temperatureMeta(temperature)
  return (
    <Badge
      size={size}
      className={cn('uppercase tracking-[0.03em]', meta.badge, className)}
      dotClassName={meta.dot}
      title={meta.description}
    >
      {meta.label}
    </Badge>
  )
}

/** Compact dot + label used inside dense table cells. */
export function TemperatureMark({
  temperature,
}: {
  temperature?: OpportunityTemperature | null
}) {
  const meta = temperatureMeta(temperature)
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn('size-2 shrink-0 rounded-full', meta.dot)} aria-hidden />
      <span className="text-[13px] font-medium text-ink">{meta.label}</span>
    </span>
  )
}

import type { ReactNode } from 'react'

import { cn } from '@/shared/cn'

export interface BadgeProps {
  children: ReactNode
  className?: string
  /** Renders a leading status dot so meaning is never carried by color alone. */
  dotClassName?: string
  size?: 'sm' | 'md'
  title?: string
}

export function Badge({ children, className, dotClassName, size = 'sm', title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap',
        size === 'sm' ? 'h-[22px] px-1.5 text-[11.5px]' : 'h-6 px-2 text-xs',
        'bg-surface-sunken text-ink-secondary border-line',
        className,
      )}
    >
      {dotClassName && <span className={cn('size-1.5 shrink-0 rounded-full', dotClassName)} />}
      {children}
    </span>
  )
}

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
        'inline-flex max-w-full items-center gap-1.5 overflow-hidden rounded-md border font-medium',
        size === 'sm' ? 'h-[22px] px-1.5 text-[11.5px]' : 'h-6 px-2 text-xs',
        'bg-surface-sunken text-ink-secondary border-line',
        className,
      )}
    >
      {dotClassName && <span className={cn('size-1.5 shrink-0 rounded-full', dotClassName)} />}
      {typeof children === 'string' ? <span className="truncate">{children}</span> : children}
    </span>
  )
}

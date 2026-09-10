import type { ReactNode } from 'react'

import { cn } from '@/shared/cn'

interface PanelProps {
  children: ReactNode
  className?: string
  /** Removes internal padding for tables that manage their own spacing. */
  flush?: boolean
}

/** Standard content surface: white, hairline border, no shadow. */
export function Panel({ children, className, flush }: PanelProps) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border border-line bg-surface',
        !flush && 'p-4',
        className,
      )}
    >
      {children}
    </section>
  )
}

interface PanelHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function PanelHeader({ title, description, action, className }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-line px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] leading-tight font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[12.5px] text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** Small caps label used above grouped detail fields. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <dt className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-subtle uppercase">
      {children}
    </dt>
  )
}

export function FieldValue({ children, className }: { children: ReactNode; className?: string }) {
  return <dd className={cn('mt-1 text-[13.5px] text-ink', className)}>{children}</dd>
}

export function DetailGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', className)}>{children}</dl>
}

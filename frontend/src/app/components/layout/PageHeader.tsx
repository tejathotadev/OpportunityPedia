import type { ReactNode } from 'react'

import { cn } from '@/shared/cn'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  /** Breadcrumb or back-link slot rendered above the title. */
  eyebrow?: ReactNode
  className?: string
  border?: boolean
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  className,
  border = true,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 pb-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6',
        border && 'border-b border-line',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
        <h1 className="truncate text-[26px] leading-tight font-semibold text-ink lg:text-[28px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

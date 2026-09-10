import * as Primitive from '@radix-ui/react-dropdown-menu'
import type { ReactNode } from 'react'

import { cn } from '@/shared/cn'

export const DropdownMenu = Primitive.Root
export const DropdownMenuTrigger = Primitive.Trigger

export function DropdownMenuContent({
  children,
  align = 'end',
  className,
  sideOffset = 6,
}: {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
  sideOffset?: number
}) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'ox-anim-pop z-50 min-w-52 overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-overlay',
          className,
        )}
      >
        {children}
      </Primitive.Content>
    </Primitive.Portal>
  )
}

export function DropdownMenuItem({
  children,
  onSelect,
  destructive,
  disabled,
  icon,
  className,
}: {
  children: ReactNode
  onSelect?: () => void
  destructive?: boolean
  disabled?: boolean
  icon?: ReactNode
  className?: string
}) {
  return (
    <Primitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] outline-none',
        'text-ink-secondary data-highlighted:bg-surface-sunken data-highlighted:text-ink',
        'data-disabled:cursor-not-allowed data-disabled:text-ink-subtle',
        destructive && 'text-danger data-highlighted:bg-danger-soft data-highlighted:text-danger',
        className,
      )}
    >
      {icon && <span className="shrink-0 [&_svg]:size-4">{icon}</span>}
      {children}
    </Primitive.Item>
  )
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <Primitive.Label className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-ink-subtle uppercase">
      {children}
    </Primitive.Label>
  )
}

export function DropdownMenuSeparator() {
  return <Primitive.Separator className="my-1 h-px bg-line" />
}

import * as Primitive from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

import { cn } from '@/shared/cn'

interface DrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Announced to assistive tech; visually the header is rendered by children. */
  title: string
  children: ReactNode
  className?: string
}

/**
 * Right-side contextual panel. Full-screen below `sm` so opportunity detail
 * stays readable on a phone. Esc and overlay click close it.
 */
export function Drawer({ open, onOpenChange, title, children, className }: DrawerProps) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="ox-anim-overlay fixed inset-0 z-40 bg-forest-950/30" />
        <Primitive.Content
          className={cn(
            'ox-anim-drawer fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-surface',
            'sm:max-w-[min(680px,92vw)] sm:border-l sm:border-line sm:shadow-panel',
            className,
          )}
        >
          <Primitive.Title className="sr-only">{title}</Primitive.Title>
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  )
}

export const DrawerClose = Primitive.Close

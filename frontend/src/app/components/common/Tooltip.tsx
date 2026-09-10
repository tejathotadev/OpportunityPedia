import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

import { cn } from '@/shared/cn'

export const TooltipProvider = TooltipPrimitive.Provider

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  /** Set false to render children untouched when there is nothing to explain. */
  enabled?: boolean
}

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  enabled = true,
}: TooltipProps) {
  if (!enabled || !content) return <>{children}</>

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'ox-anim-pop z-50 max-w-xs rounded-md bg-forest-900 px-2.5 py-1.5',
            'text-[12.5px] leading-snug text-white shadow-overlay',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

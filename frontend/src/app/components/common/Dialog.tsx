import * as Primitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/cn'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** `lg` is used by the outreach composer; it goes full-screen on mobile. */
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
} as const

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="ox-anim-overlay fixed inset-0 z-50 bg-forest-950/35" />
        <Primitive.Content
          className={cn(
            'ox-anim-dialog fixed z-50 flex flex-col bg-surface',
            'inset-0 h-full w-full',
            'sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[88vh] sm:-translate-x-1/2 sm:-translate-y-1/2',
            'sm:rounded-xl sm:border sm:border-line sm:shadow-overlay',
            SIZES[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <Primitive.Title className="text-[15px] font-semibold text-ink">
                {title}
              </Primitive.Title>
              {description && (
                <Primitive.Description asChild>
                  <div className="mt-1 text-[13px] text-ink-muted">{description}</div>
                </Primitive.Description>
              )}
            </div>
            <Primitive.Close
              aria-label="Close"
              className="-mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <X className="size-[18px]" />
            </Primitive.Close>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3">
              {footer}
            </div>
          )}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  )
}

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive,
  onConfirm,
}: ConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className={cn(
              'inline-flex h-9 items-center rounded-md px-3.5 text-sm font-medium text-white transition-colors',
              destructive ? 'bg-danger hover:bg-danger-strong' : 'bg-signal-600 hover:bg-signal-700',
            )}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-secondary">{description}</p>
    </Dialog>
  )
}

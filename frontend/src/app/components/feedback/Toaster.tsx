import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useEffect } from 'react'

import { useToastStore, type Toast as ToastModel } from '@/app/store/useToastStore'
import { cn } from '@/shared/cn'

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

const ICON_TONE = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-forest-600',
} as const

const AUTO_DISMISS_MS = 5000

function ToastCard({ toast }: { toast: ToastModel }) {
  const dismiss = useToastStore((state) => state.dismiss)
  const Icon = ICONS[toast.variant]

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [toast.id, dismiss])

  return (
    <div
      role="status"
      className="ox-anim-toast pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-surface p-3 shadow-overlay"
    >
      <Icon className={cn('mt-px size-[18px] shrink-0', ICON_TONE[toast.variant])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{toast.description}</p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick()
              dismiss(toast.id)
            }}
            className="mt-1.5 text-[12.5px] font-medium text-signal-700 underline-offset-2 hover:underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dismiss(toast.id)}
        className="-mt-0.5 -mr-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 sm:w-auto"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} toast={item} />
      ))}
    </div>
  )
}

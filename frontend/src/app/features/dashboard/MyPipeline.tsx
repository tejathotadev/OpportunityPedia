import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ErrorState, Skeleton } from '@/app/components/feedback/States'
import type { PipelineSummary } from '@/app/types'
import { cn } from '@/shared/cn'

interface MyPipelineProps {
  summary?: PipelineSummary
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

const ROWS: Array<{
  key: keyof PipelineSummary
  label: string
  to: string
  tone?: string
}> = [
  { key: 'assigned', label: 'Assigned', to: '/app/my-assignments?tab=all' },
  {
    key: 'needsOutreach',
    label: 'Needs outreach',
    to: '/app/my-assignments?tab=needs_outreach',
    tone: 'text-hot-strong',
  },
  { key: 'contacted', label: 'Contacted', to: '/app/my-assignments?tab=contacted' },
  {
    key: 'followUp',
    label: 'Follow-up',
    to: '/app/my-assignments?tab=follow_up',
    tone: 'text-warm-strong',
  },
]

/** Each row is a shortcut into the matching filtered assignment list. */
export function MyPipeline({ summary, isLoading, isError, onRetry }: MyPipelineProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {ROWS.map((row) => (
          <Skeleton key={row.key} className="h-9 w-full" />
        ))}
      </div>
    )
  }

  // Without this the failed and still-loading cases look identical, leaving
  // skeletons pulsing forever with no way to retry.
  if (isError || !summary) {
    return <ErrorState compact onRetry={onRetry} />
  }

  return (
    <ul className="divide-y divide-line">
      {ROWS.map((row) => (
        <li key={row.key}>
          <button
            type="button"
            onClick={() => navigate(row.to)}
            className="group flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted"
          >
            <span className="text-[13.5px] text-ink-secondary">{row.label}</span>
            <span className="flex items-center gap-2">
              <span className={cn('nums text-[15px] font-semibold text-ink', row.tone)}>
                {summary[row.key]}
              </span>
              <ChevronRight
                className="size-3.5 text-ink-subtle transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

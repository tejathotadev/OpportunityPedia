import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, ChevronUp, History, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Drawer, DrawerClose } from '@/app/components/common/Drawer'
import { EmptyState, ErrorState, ListSkeleton } from '@/app/components/feedback/States'
import { getRadarRunHistory, type RadarRunHistoryRow } from '@/app/services/radar'
import { queryKeys } from '@/app/services/queryKeys'
import { useUiStore } from '@/app/store/useUiStore'
import { cn } from '@/shared/cn'

function formatRunWhen(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function statusTone(status: string): string {
  const key = status.toLowerCase()
  if (key === 'ok' || key === 'success') return 'bg-success/15 text-success'
  if (key === 'failed' || key === 'error') return 'bg-danger/10 text-danger'
  if (key === 'running') return 'bg-signal-50 text-signal-800'
  return 'bg-surface-sunken text-ink-muted'
}

function RunCard({
  run,
  expanded,
  onToggle,
}: {
  run: RadarRunHistoryRow
  expanded: boolean
  onToggle: () => void
}) {
  const hasUpdates = run.newCount > 0 && (run.newItems?.length ?? 0) > 0

  return (
    <li className="overflow-hidden rounded-lg border border-line bg-surface">
      <button
        type="button"
        className="flex w-full cursor-pointer items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-muted"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span
          className={cn(
            'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full',
            run.newCount > 0 ? 'bg-signal-50 text-signal-700' : 'bg-surface-sunken text-ink-muted',
          )}
        >
          <CheckCircle2 className="size-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-semibold text-ink">Run #{run.runNumber}</span>
            <span
              className={cn(
                'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize',
                statusTone(run.status),
              )}
            >
              {run.status}
            </span>
          </span>
          <span className="mt-0.5 block text-[12.5px] text-ink-muted">
            {formatRunWhen(run.createdAt)}
          </span>
          <span className="mt-2 flex flex-wrap gap-1.5">
            <span className="nums rounded-md border border-line bg-surface-sunken px-2 py-0.5 text-[12px] text-ink-secondary">
              {run.jobsFound} found
            </span>
            <span
              className={cn(
                'nums rounded-md border px-2 py-0.5 text-[12px] font-medium',
                run.newCount > 0
                  ? 'border-signal-200 bg-signal-50 text-signal-800'
                  : 'border-line bg-surface-sunken text-ink-muted',
              )}
            >
              {run.newCount} new
            </span>
          </span>
        </span>
        <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-signal-700">
          {expanded ? 'Hide' : 'Updates'}
          {expanded ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-line bg-surface-muted/50 px-3.5 py-3">
          {hasUpdates ? (
            <ul className="space-y-2">
              {run.newItems.map((item, index) => (
                <li
                  key={`${item.externalJobId || index}`}
                  className="rounded-md border border-line bg-surface px-3 py-2"
                >
                  <p className="text-[13px] font-medium text-ink">
                    {item.title?.trim() || 'Untitled opportunity'}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                    {item.boardName?.trim() || 'Company'}
                    {item.naics ? ` · NAICS ${item.naics}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-secondary">
              No new opportunities on this run
              {run.jobsFound ? ` (${run.jobsFound} already tracked).` : '.'}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

/** Sidebar-opened history of Radar scans for the current workspace. */
export function RadarRunsDrawer() {
  const open = useUiStore((state) => state.radarRunsOpen)
  const setOpen = useUiStore((state) => state.setRadarRunsOpen)
  const expandLatest = useUiStore((state) => state.radarRunsExpandLatest)
  const [expandedId, setExpandedId] = useState<string | number | null>(null)

  const history = useQuery({
    queryKey: queryKeys.radarRuns(),
    queryFn: getRadarRunHistory,
    staleTime: 15_000,
    enabled: open,
  })

  const runs = history.data?.runs ?? []

  useEffect(() => {
    if (!open || !expandLatest || !runs.length) return
    setExpandedId(runs[0].id)
    useUiStore.setState({ radarRunsExpandLatest: false })
  }, [open, expandLatest, runs])

  return (
    <Drawer open={open} onOpenChange={setOpen} title="Radar runs">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">Radar runs</p>
          <p className="truncate text-[12.5px] text-ink-muted">
            Each scan and the updates it found
          </p>
        </div>
        <DrawerClose
          aria-label="Close Radar runs"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <X className="size-[18px]" />
        </DrawerClose>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-3">
        {history.isLoading ? (
          <ListSkeleton rows={4} />
        ) : history.isError ? (
          <ErrorState
            title="Could not load Radar history"
            description="Try again in a moment."
            onRetry={() => void history.refetch()}
          />
        ) : !runs.length ? (
          <EmptyState
            icon={<History />}
            title="No Radar runs yet"
            description="When you run Radar from Overview, each scan appears here."
          />
        ) : (
          <ul className="space-y-2.5">
            {runs.map((run) => (
              <RunCard
                key={String(run.id)}
                run={run}
                expanded={expandedId === run.id}
                onToggle={() => setExpandedId(expandedId === run.id ? null : run.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  )
}

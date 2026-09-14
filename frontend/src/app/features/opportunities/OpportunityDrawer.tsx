import * as Tabs from '@radix-ui/react-tabs'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ExternalLink, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { TemperatureBadge } from '@/app/components/badges/TemperatureBadge'
import { OpportunityTypeBadge, OutreachStatusBadge } from '@/app/components/badges/StatusBadges'
import { IconButton } from '@/app/components/common/Button'
import { Drawer } from '@/app/components/common/Drawer'
import { Tooltip } from '@/app/components/common/Tooltip'
import { ErrorState, ListSkeleton, Skeleton } from '@/app/components/feedback/States'
import { useOpportunityMutations } from '@/app/hooks/useOpportunityMutations'
import { getOpportunityById } from '@/app/services/opportunities'
import { queryKeys } from '@/app/services/queryKeys'
import { cn } from '@/shared/cn'
import { formatDate, formatDateTimeFull, getDeadlineUrgency } from '@/app/utils/date'
import { EmailComposer } from '@/app/features/outreach/EmailComposer'
import { OutreachHistoryDialog } from '@/app/features/outreach/OutreachHistoryDialog'

import { OpportunityActionBar } from './OpportunityActionBar'
import { ActivityTab, ContactTab, OverviewTab } from './OpportunityTabs'

interface OpportunityDrawerProps {
  opportunityId: string | null
  open: boolean
  onClose: () => void
  /** Name of the list the user came from, shown so context is never lost. */
  contextLabel?: string
}

const TAB_TRIGGER =
  'relative h-9 whitespace-nowrap px-3 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink data-[state=active]:text-ink ' +
  'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-signal-600'

export function OpportunityDrawer({
  opportunityId,
  open,
  onClose,
  contextLabel = 'Opportunities',
}: OpportunityDrawerProps) {
  const [composerOpen, setComposerOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { assign, reassign, unassign } = useOpportunityMutations()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.opportunity(opportunityId ?? ''),
    queryFn: () => getOpportunityById(opportunityId as string),
    enabled: Boolean(opportunityId) && open,
  })

  const urgency = getDeadlineUrgency(data?.deadline)

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => !next && onClose()}
        title={data?.title ?? 'Opportunity details'}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {contextLabel}
          </button>

          <div className="ml-auto flex items-center gap-1">
            {data && (
              <Tooltip content="Open as full page">
                <Link
                  to={`/app/opportunities/${data.id}`}
                  className="inline-flex size-7 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-surface-sunken hover:text-ink"
                  aria-label="Open as full page"
                >
                  <ExternalLink className="size-4" />
                </Link>
              </Tooltip>
            )}
            <IconButton label="Close panel" size="sm" onClick={onClose}>
              <X />
            </IconButton>
          </div>
        </div>

        {isError ? (
          <ErrorState
            title="We couldn’t load this opportunity."
            description="Check your connection and try again."
            onRetry={() => void refetch()}
          />
        ) : isLoading || !data ? (
          <div className="space-y-4 p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <ListSkeleton rows={3} />
          </div>
        ) : (
          <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="px-5 pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <TemperatureBadge temperature={data.temperature} size="md" />
                <OpportunityTypeBadge type={data.type} noticeType={data.noticeType} />
                {data.outreachStatus !== 'not_contacted' && (
                  <OutreachStatusBadge status={data.outreachStatus} />
                )}
              </div>
              <h2 className="mt-2.5 text-[19px] leading-snug font-semibold text-ink">
                {data.title}
              </h2>
              <Link
                to={
                  data.type === 'hiring'
                    ? `/app/opportunities?lane=hiring`
                    : `/app/opportunities?lane=government`
                }
                className="mt-1 inline-block text-[13.5px] text-ink-secondary underline-offset-2 hover:text-ink hover:underline"
              >
                {data.companyName}
              </Link>

              <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px]">
                <div className="flex items-center gap-1.5">
                  <dt className="text-ink-muted">Detected</dt>
                  <dd className="nums font-medium text-ink" title={formatDateTimeFull(data.detectedAt)}>
                    {formatDate(data.detectedAt)}
                  </dd>
                </div>
                {data.deadline && (
                  <div className="flex items-center gap-1.5">
                    <dt className="text-ink-muted">Deadline</dt>
                    <dd className="nums font-medium text-ink">
                      {formatDate(data.deadline)}
                      {urgency && (
                        <span className={cn('ml-1.5 font-normal', urgency.className)}>
                          {urgency.label}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <OpportunityActionBar
              opportunity={data}
              isAssigning={assign.isPending}
              onAssign={(assignee) =>
                assign.mutate({ opportunityId: data.id, assignee })
              }
              onReassign={(userId) => reassign.mutate({ opportunityId: data.id, userId })}
              onUnassign={() => unassign.mutate(data.id)}
              onSendOutreach={() => setComposerOpen(true)}
              onReviewOutreach={() => setHistoryOpen(true)}
            />

            <Tabs.Root defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
              <Tabs.List
                aria-label="Opportunity details"
                className="scrollbar-thin flex shrink-0 gap-0.5 overflow-x-auto border-b border-line px-3"
              >
                <Tabs.Trigger value="overview" className={TAB_TRIGGER}>
                  Overview
                </Tabs.Trigger>
                <Tabs.Trigger value="contact" className={TAB_TRIGGER}>
                  Contact
                </Tabs.Trigger>
                <Tabs.Trigger value="activity" className={TAB_TRIGGER}>
                  Activity
                </Tabs.Trigger>
              </Tabs.List>

              <div className="px-5 py-5">
                <Tabs.Content value="overview">
                  <OverviewTab opportunity={data} />
                </Tabs.Content>
                <Tabs.Content value="contact">
                  <ContactTab opportunity={data} />
                </Tabs.Content>
                <Tabs.Content value="activity">
                  <ActivityTab opportunityId={data.id} />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          </div>
        )}
      </Drawer>

      {data && (
        <>
          <EmailComposer
            opportunity={data}
            open={composerOpen}
            onOpenChange={setComposerOpen}
          />
          <OutreachHistoryDialog
            opportunity={data}
            open={historyOpen}
            onOpenChange={setHistoryOpen}
          />
        </>
      )}
    </>
  )
}

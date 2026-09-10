import { useQuery } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { StatCard } from '@/app/components/common/StatCard'
import { EmptyState } from '@/app/components/feedback/States'
import { PageHeader } from '@/app/components/layout/PageHeader'
import { Panel } from '@/app/components/layout/Panel'
import { OpportunityDrawer } from '@/app/features/opportunities/OpportunityDrawer'
import { OpportunityTable } from '@/app/features/opportunities/OpportunityTable'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { getMyAssignments } from '@/app/services/assignments'
import { queryKeys } from '@/app/services/queryKeys'
import type { Opportunity } from '@/app/types'
import { cn } from '@/shared/cn'
import { daysUntil } from '@/app/utils/date'
import { byPriority } from '@/app/utils/opportunity'

type AssignmentTab = 'all' | 'needs_outreach' | 'contacted' | 'follow_up' | 'completed'

const TABS: Array<{ id: AssignmentTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'needs_outreach', label: 'Needs Outreach' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'completed', label: 'Completed' },
]

function matchesTab(opportunity: Opportunity, tab: AssignmentTab): boolean {
  switch (tab) {
    case 'needs_outreach':
      return opportunity.outreachStatus === 'not_contacted'
    case 'contacted':
      return opportunity.outreachStatus === 'contacted' || opportunity.outreachStatus === 'replied'
    case 'follow_up':
      return opportunity.outreachStatus === 'follow_up_required'
    case 'completed':
      return opportunity.outreachStatus === 'completed'
    default:
      return true
  }
}

export function MyAssignmentsPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const tab = (searchParams.get('tab') as AssignmentTab | null) ?? 'all'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.myAssignments(),
    queryFn: () => getMyAssignments(),
  })

  const all = useMemo(() => [...(data ?? [])].sort(byPriority), [data])
  const rows = useMemo(() => all.filter((item) => matchesTab(item, tab)), [all, tab])

  const counts = useMemo(
    () => ({
      total: all.length,
      needsOutreach: all.filter((item) => item.outreachStatus === 'not_contacted').length,
      followUps: all.filter((item) => item.outreachStatus === 'follow_up_required').length,
      upcomingDeadlines: all.filter((item) => {
        const days = daysUntil(item.deadline)
        return days !== null && days >= 0 && days <= 14
      }).length,
    }),
    [all],
  )

  return (
    <div className="space-y-5">
      <PageHeader title="My Assignments" subtitle="Opportunities currently owned by you." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="My Opportunities" value={counts.total} />
        <StatCard
          label="Needs Outreach"
          value={counts.needsOutreach}
          context={counts.needsOutreach > 0 ? 'Waiting on first contact' : 'All contacted'}
          contextTone={counts.needsOutreach > 0 ? 'warning' : 'neutral'}
        />
        <StatCard label="Follow-ups" value={counts.followUps} />
        <StatCard
          label="Upcoming Deadlines"
          value={counts.upcomingDeadlines}
          context="Within 14 days"
        />
      </div>

      <Panel flush>
        <div
          role="tablist"
          aria-label="Assignment status"
          className="scrollbar-thin flex gap-0.5 overflow-x-auto border-b border-line px-2"
        >
          {TABS.map((item) => {
            const active = tab === item.id
            const count = all.filter((row) => matchesTab(row, item.id)).length
            return (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() =>
                  setSearchParams(item.id === 'all' ? {} : { tab: item.id }, { replace: true })
                }
                className={cn(
                  'relative h-10 shrink-0 px-3 text-[13px] font-medium whitespace-nowrap transition-colors',
                  'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full',
                  active
                    ? 'text-ink after:bg-signal-600'
                    : 'text-ink-muted after:bg-transparent hover:text-ink',
                )}
              >
                {item.label}
                <span className="nums ml-1.5 text-[12px] text-ink-subtle">{count}</span>
              </button>
            )
          })}
        </div>

        <OpportunityTable
          rows={rows}
          currentUserId={user.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          columns={[
            'title',
            'temperature',
            'assignedAt',
            'lastContactedAt',
            'outreachStatus',
            'nextAction',
            'deadline',
            'actions',
          ]}
          onRowClick={(opportunity) => setSelectedId(opportunity.id)}
          onSendOutreach={(opportunity) => setSelectedId(opportunity.id)}
          emptyState={
            all.length === 0 ? (
              <EmptyState
                icon={<Inbox />}
                title="Nothing assigned yet"
                description="Assign an opportunity to yourself to start building your pipeline."
                action={{ label: 'Browse opportunities', onClick: () => navigate('/app/opportunities') }}
              />
            ) : (
              <EmptyState
                icon={<Inbox />}
                title="Nothing in this view"
                description="No opportunities you own currently match this status."
                secondaryAction={{
                  label: 'Show all assignments',
                  onClick: () => setSearchParams({}, { replace: true }),
                }}
              />
            )
          }
        />
      </Panel>

      <OpportunityDrawer
        opportunityId={selectedId}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        contextLabel="My Assignments"
      />
    </div>
  )
}

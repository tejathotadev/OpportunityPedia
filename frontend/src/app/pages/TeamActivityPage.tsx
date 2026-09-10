import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ActivityFeed } from '@/app/components/activity/ActivityFeed'
import { UserAvatar } from '@/app/components/common/Avatar'
import {
  MultiSelectFilter,
  SingleSelectFilter,
  type FilterOption,
} from '@/app/components/filters/FilterMenu'
import { EmptyState, ListSkeleton } from '@/app/components/feedback/States'
import { PageHeader } from '@/app/components/layout/PageHeader'
import { Panel, PanelHeader } from '@/app/components/layout/Panel'
import { activityTypeLabel } from '@/app/constants/opportunity'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { getTeamActivity } from '@/app/services/activity'
import { getTeamOwnership } from '@/app/services/assignments'
import { getAllOpportunities } from '@/app/services/opportunities'
import { queryKeys } from '@/app/services/queryKeys'
import type { ActivityType } from '@/app/types'
import { cn } from '@/shared/cn'

const ACTIVITY_FILTERS: ActivityType[] = [
  'assigned',
  'contacted',
  'follow_up',
  'reassigned',
  'completed',
]

const TYPE_OPTIONS: FilterOption<ActivityType>[] = ACTIVITY_FILTERS.map((value) => ({
  value,
  label: activityTypeLabel(value),
}))

const DATE_OPTIONS: FilterOption<string>[] = [
  { value: 'any', label: 'All time' },
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
]

export function TeamActivityPage() {
  const navigate = useNavigate()
  const { user, team } = useCurrentUser()
  const [actorId, setActorId] = useState<string | undefined>()
  const [types, setTypes] = useState<ActivityType[]>([])
  const [withinDays, setWithinDays] = useState<number | undefined>()

  const query = { actorId, type: types.length ? types : undefined, withinDays, limit: 60 }

  const activity = useQuery({
    queryKey: queryKeys.teamActivity(query),
    queryFn: () => getTeamActivity(query),
  })
  const ownership = useQuery({
    queryKey: queryKeys.teamOwnership(),
    queryFn: () => getTeamOwnership(),
  })
  const opportunities = useQuery({
    queryKey: queryKeys.allOpportunities(),
    queryFn: getAllOpportunities,
  })

  const teamOptions = useMemo<FilterOption<string>[]>(
    () => [
      { value: 'any', label: 'Everyone' },
      ...team.map((member) => ({
        value: member.id,
        label: member.id === user.id ? `${member.name} (you)` : member.name,
      })),
    ],
    [team, user.id],
  )

  const entries = activity.data ?? []

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team Activity"
        subtitle="See ownership and outreach activity across your team."
      />

      <Panel flush>
        <PanelHeader
          title="Team ownership"
          description="Who is holding what, so nobody contacts the same company twice"
        />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-muted">
              <tr className="border-b border-line">
                {['User', 'Assigned', 'Needs Outreach', 'Contacted Today', 'Follow-ups'].map(
                  (header, index) => (
                    <th
                      key={header}
                      scope="col"
                      className={cn(
                        'px-4 py-2.5 text-[11.5px] font-semibold tracking-[0.04em] text-ink-muted uppercase',
                        index > 0 && 'text-right',
                      )}
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(ownership.data ?? []).map((row) => (
                <tr key={row.user.id} className="bg-surface">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <UserAvatar name={row.user.name} tone={row.user.avatarTone} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium text-ink">
                          {row.user.id === user.id ? `${row.user.name} (you)` : row.user.name}
                        </span>
                        <span className="block truncate text-[12px] text-ink-muted">
                          {row.user.jobTitle}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="nums px-4 py-2.5 text-right text-[13.5px] text-ink">
                    {row.assigned}
                  </td>
                  <td
                    className={cn(
                      'nums px-4 py-2.5 text-right text-[13.5px]',
                      row.needsOutreach > 0 ? 'text-hot-strong' : 'text-ink',
                    )}
                  >
                    {row.needsOutreach}
                  </td>
                  <td className="nums px-4 py-2.5 text-right text-[13.5px] text-ink">
                    {row.contactedToday}
                  </td>
                  <td className="nums px-4 py-2.5 text-right text-[13.5px] text-ink">
                    {row.followUps}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <SingleSelectFilter
            label="Team member"
            options={teamOptions}
            value={actorId}
            anyValue="any"
            onChange={setActorId}
          />
          <MultiSelectFilter
            label="Activity type"
            options={TYPE_OPTIONS}
            selected={types}
            onChange={setTypes}
          />
          <SingleSelectFilter
            label="Date"
            options={DATE_OPTIONS}
            value={withinDays ? String(withinDays) : undefined}
            anyValue="any"
            onChange={(next) => setWithinDays(next ? Number(next) : undefined)}
          />
          {(actorId || types.length > 0 || withinDays) && (
            <button
              type="button"
              onClick={() => {
                setActorId(undefined)
                setTypes([])
                setWithinDays(undefined)
              }}
              className="text-[12.5px] font-medium text-signal-700 underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {activity.isLoading ? (
          <ListSkeleton rows={6} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<Activity />}
            title="No team activity yet."
            description="Assignments and outreach will appear here as your team works."
            action={{ label: 'Browse opportunities', onClick: () => navigate('/app/opportunities') }}
          />
        ) : (
          <ActivityFeed entries={entries} opportunities={opportunities.data ?? []} />
        )}
      </Panel>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Activity } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ActivityFeed } from '@/app/components/activity/ActivityFeed'
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
import { queryKeys } from '@/app/services/queryKeys'
import type { ActivityType } from '@/app/types'

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
  const hasFilters = Boolean(actorId || types.length > 0 || withinDays)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Team Activity"
        subtitle="Assignments and outreach across your workspace."
      />

      <Panel flush>
        <PanelHeader
          title="Activity feed"
          description="Recent ownership and outreach actions from your team"
        />

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
          {hasFilters && (
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
            title={hasFilters ? 'No activity matches these filters.' : 'No team activity yet.'}
            description={
              hasFilters
                ? 'Try clearing filters or widening the date range.'
                : 'Assignments and outreach will appear here as your team works.'
            }
            action={
              hasFilters
                ? {
                    label: 'Clear filters',
                    onClick: () => {
                      setActorId(undefined)
                      setTypes([])
                      setWithinDays(undefined)
                    },
                  }
                : {
                    label: 'Browse opportunities',
                    onClick: () => navigate('/app/opportunities'),
                  }
            }
          />
        ) : (
          <ActivityFeed entries={entries} />
        )}
      </Panel>
    </div>
  )
}

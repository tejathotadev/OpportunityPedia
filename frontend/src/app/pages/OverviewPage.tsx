import { useQuery } from '@tanstack/react-query'
import { Clock, Flame, Radar, RotateCw, ThermometerSun, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ActivityFeed } from '@/app/components/activity/ActivityFeed'
import { Button } from '@/app/components/common/Button'
import { StatCard } from '@/app/components/common/StatCard'
import { Tooltip } from '@/app/components/common/Tooltip'
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
  ListSkeleton,
} from '@/app/components/feedback/States'
import { PageHeader } from '@/app/components/layout/PageHeader'
import { Panel, PanelHeader } from '@/app/components/layout/Panel'
import { MyPipeline } from '@/app/features/dashboard/MyPipeline'
import { NeedsAttentionTable } from '@/app/features/dashboard/NeedsAttentionTable'
import { UpcomingDeadlines } from '@/app/features/dashboard/UpcomingDeadlines'
import { OpportunityDrawer } from '@/app/features/opportunities/OpportunityDrawer'
import { SingleSelectFilter, type FilterOption } from '@/app/components/filters/FilterMenu'
import {
  COUNTRY_FILTER_LABEL,
  COUNTRY_FILTERS,
  DETECTED_RANGE_LABEL,
  DETECTED_RANGES,
  OPPORTUNITY_CATEGORIES,
  OPPORTUNITY_CATEGORY_LABEL,
  OPPORTUNITY_CATEGORY_TYPES,
  type CountryFilter,
  type DetectedRange,
  type OpportunityCategory,
} from '@/app/constants/opportunity'
import { useOpportunityMutations } from '@/app/hooks/useOpportunityMutations'
import { useRadarCooldown } from '@/app/hooks/useRadarCooldown'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { ApiError } from '@/app/services/api'
import { getTeamActivity } from '@/app/services/activity'
import { getDashboardOverview } from '@/app/services/dashboard'
import { triggerRadarRun } from '@/app/services/radar'
import { queryKeys } from '@/app/services/queryKeys'
import { toast } from '@/app/store/useToastStore'
import { firstNameOf } from '@/app/utils/format'
import { cn } from '@/shared/cn'

const RANGE_OPTIONS: FilterOption<DetectedRange>[] = DETECTED_RANGES.map((value) => ({
  value,
  label: DETECTED_RANGE_LABEL[value],
}))

const COUNTRY_OPTIONS: FilterOption<CountryFilter>[] = COUNTRY_FILTERS.map((value) => ({
  value,
  label: COUNTRY_FILTER_LABEL[value],
}))

function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function OverviewPage() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const { assign } = useOpportunityMutations()
  const {
    isCoolingDown,
    countdown,
    hasCountdown,
    reason,
    isRunning,
    applyStatus,
    refreshStatus,
  } = useRadarCooldown()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [category, setCategory] = useState<OpportunityCategory>('all')
  const [range, setRange] = useState<DetectedRange>('any')
  const [country, setCountry] = useState<CountryFilter>('any')

  const categoryTypes = OPPORTUNITY_CATEGORY_TYPES[category]
  const detectedWithinDays = range === 'any' ? undefined : Number(range)
  const countries = country === 'any' ? undefined : [country]
  const scope = { types: categoryTypes, detectedWithinDays, countries }
  /** The weekly count ignores the range, so hide it once it could exceed the
   *  total it sits beneath. */
  const showWeeklyDelta = !detectedWithinDays || detectedWithinDays >= 7

  /** Carries the active scope through to the filtered list on drill-through. */
  const scoped = (path: string) => {
    const params = new URLSearchParams()
    if (categoryTypes.length) params.set('type', categoryTypes.join(','))
    if (detectedWithinDays) params.set('detected', String(detectedWithinDays))
    if (countries?.length) params.set('country', countries.join(','))
    const query = params.toString()
    return query ? `${path}${path.includes('?') ? '&' : '?'}${query}` : path
  }

  const overview = useQuery({
    queryKey: queryKeys.dashboardOverview(category, range, country),
    queryFn: () => getDashboardOverview(scope, { attentionLimit: 8, deadlinesLimit: 5 }),
  })
  const metrics = overview.data?.metrics
  const pipeline = overview.data?.pipeline
  const attentionItems = overview.data?.needsAttention.items
  const deadlineItems = overview.data?.deadlines.items
  // The dashboard feed is about people, so system scoring events are excluded.
  const activityQuery = {
    type: ['assigned', 'reassigned', 'unassigned', 'contacted', 'replied', 'follow_up'] as const,
    limit: 7,
  }
  const activity = useQuery({
    queryKey: queryKeys.teamActivity(activityQuery),
    queryFn: () => getTeamActivity({ type: [...activityQuery.type], limit: activityQuery.limit }),
  })

  /**
   * Asks the backend to queue a re-scan of every source.
   *
   * The scan costs upstream API quota, so the backend decides whether it is
   * allowed and returns the new limits — nothing here starts a timer of its
   * own. A rejected run leaves the quota untouched. The request returns as
   * soon as the run is accepted, well before results exist; the dashboard is
   * refreshed by the effect below once the scan reports itself finished.
   */
  const runRadar = async () => {
    if (isCoolingDown || scanning) return
    setScanning(true)
    try {
      const { cooldown } = await triggerRadarRun()
      // Already reports the scan as running, so the button stays in its
      // scanning state without waiting for the first poll.
      applyStatus(cooldown)
      toast.info('Scan started', 'Collecting the latest opportunities. This takes a minute.')
    } catch (error) {
      // The server owns the rate-limit copy, so read it back rather than
      // guessing why the run was refused.
      const status = await refreshStatus().catch(() => undefined)
      const refused = error instanceof ApiError && error.status === 429
      toast.error(
        refused ? 'Radar is rate limited' : 'Radar scan failed',
        status?.reason ?? 'Could not refresh the pipeline. Try again.',
      )
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        border={false}
        className="pb-1"
        title={`${greeting()}, ${firstNameOf(user.name)}`}
        subtitle="Here’s what needs attention across your opportunity pipeline."
        actions={
          <Tooltip
            enabled={isCoolingDown}
            content={reason ?? 'Scans are limited by the upstream API quota.'}
          >
            <span>
              <Button
                variant="primary"
                iconLeft={isCoolingDown ? <Clock /> : <Radar />}
                loading={scanning || isRunning}
                disabled={isCoolingDown}
                onClick={() => void runRadar()}
              >
                {scanning || isRunning
                  ? 'Scanning…'
                  : !isCoolingDown
                    ? 'Run Radar'
                    : hasCountdown
                      ? `Available in ${countdown}`
                      : 'Rate limited'}
              </Button>
            </span>
          </Tooltip>
        }
      />

      {/* Category and lookback both re-slice stored rows, so neither costs a
          scan. They share one row to read as a single scope control. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Scope the dashboard by opportunity category"
          className="flex flex-wrap items-center gap-1.5"
        >
          {OPPORTUNITY_CATEGORIES.map((value) => {
            const comingSoon = value === 'vendors'
            const active = !comingSoon && value === category
            return (
              <button
                key={value}
                type="button"
                disabled={comingSoon}
                aria-pressed={active}
                aria-disabled={comingSoon || undefined}
                title={
                  comingSoon
                    ? 'Partnership vendors — coming soon'
                    : undefined
                }
                onClick={() => {
                  if (comingSoon) return
                  setCategory(value)
                }}
                className={cn(
                  'inline-flex h-8 items-center rounded-md border px-3 text-[13px] font-medium transition-colors',
                  comingSoon
                    ? 'cursor-not-allowed border-line bg-surface-muted text-ink-subtle'
                    : active
                      ? 'border-signal-600 bg-signal-600 text-white'
                      : 'border-line-strong bg-surface text-ink-secondary hover:bg-surface-sunken hover:text-ink',
                )}
              >
                {OPPORTUNITY_CATEGORY_LABEL[value]}
                {comingSoon ? (
                  <span className="ml-1.5 text-[10px] font-normal tracking-wide uppercase">
                    Soon
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SingleSelectFilter
            label="Location"
            options={COUNTRY_OPTIONS}
            value={country}
            anyValue="any"
            onChange={(next) => setCountry(next ?? 'any')}
          />
          <SingleSelectFilter
            label="Detected"
            options={RANGE_OPTIONS}
            value={range}
            anyValue="any"
            onChange={(next) => setRange(next ?? 'any')}
          />
        </div>
      </div>

      {/* The cards stay mounted even without data so the page keeps its shape;
          a dash reads as "unavailable" where a zero would read as a real
          count. */}
      <section aria-label="Key metrics">
        {overview.isLoading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <>
            {overview.isError && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger-line bg-danger-soft px-3 py-2">
                <p className="text-[13px] font-medium text-danger">
                  We couldn’t load these metrics.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<RotateCw />}
                  onClick={() => void overview.refetch()}
                >
                  Try again
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Total Opportunities"
                value={metrics?.totalOpportunities ?? '—'}
                context={
                  metrics && showWeeklyDelta
                    ? `+${metrics.opportunitiesAddedThisWeek} this week`
                    : undefined
                }
                icon={Radar}
                to={scoped('/app/opportunities?lane=government')}
              />
              <StatCard
                label="Very Hot"
                value={metrics?.veryHot ?? '—'}
                context={
                  metrics && `${metrics.veryHotNeedingAttention} need attention`
                }
                contextTone="critical"
                icon={Flame}
                accent="veryhot"
                to={scoped('/app/opportunities?lane=government&temperature=very_hot')}
              />
              <StatCard
                label="Hot"
                value={metrics?.hot ?? '—'}
                context={
                  metrics
                    ? `${metrics.hot} ${metrics.hot === 1 ? 'company' : 'companies'} with hiring`
                    : undefined
                }
                contextTone="neutral"
                icon={ThermometerSun}
                accent="hot"
                to={scoped('/app/opportunities?lane=commercial')}
              />
              <StatCard
                label="Assigned to Me"
                value={metrics?.assignedToMe ?? '—'}
                context={
                  metrics && `${metrics.assignedToMeNotContacted} not contacted`
                }
                contextTone={
                  (metrics?.assignedToMeNotContacted ?? 0) > 0 ? 'warning' : 'neutral'
                }
                icon={UserCheck}
                to="/app/my-assignments"
              />
            </div>
          </>
        )}
      </section>

      {/* Full width: the attention table carries eight columns and cramps badly
          in anything narrower. */}
      <Panel flush>
        <PanelHeader
          title="Needs Attention"
          description="Opportunities where a decision or outreach is overdue"
          action={
            <button
              type="button"
              onClick={() => navigate(scoped('/app/opportunities?temperature=very_hot,hot'))}
              className="text-[12.5px] font-medium text-signal-700 underline-offset-2 hover:underline"
            >
              View all
            </button>
          }
        />
        <NeedsAttentionTable
          rows={attentionItems ?? []}
          currentUserId={user.id}
          isLoading={overview.isLoading}
          isError={overview.isError}
          assigningId={assign.isPending ? assign.variables?.opportunityId : null}
          onRetry={() => void overview.refetch()}
          onOpen={(opportunity) => setSelectedId(opportunity.id)}
          onAssign={(opportunity, assignee) =>
            assign.mutate({ opportunityId: opportunity.id, assignee })
          }
        />
      </Panel>

      {/* Left: what the team did. Right rail: what I own and what is due.
          Both tracks need min-w-0 so grid items may shrink past their content
          instead of widening the row on narrow screens. */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel flush className="min-w-0 xl:col-span-2">
          <PanelHeader
            title="Recent Team Activity"
            description="Ownership and outreach across the workspace"
            action={
              <button
                type="button"
                onClick={() => navigate('/app/activity')}
                className="text-[12.5px] font-medium text-signal-700 underline-offset-2 hover:underline"
              >
                View all
              </button>
            }
          />
          {activity.isLoading ? (
            <ListSkeleton rows={5} />
          ) : activity.isError ? (
            <ErrorState compact onRetry={() => void activity.refetch()} />
          ) : (activity.data?.length ?? 0) === 0 ? (
            <EmptyState compact title="No team activity yet." />
          ) : (
            <ActivityFeed entries={activity.data ?? []} />
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel flush>
            <PanelHeader
              title="My pipeline"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/app/my-assignments')}
                  className="text-[12.5px] font-medium text-signal-700 underline-offset-2 hover:underline"
                >
                  View all
                </button>
              }
            />
            <MyPipeline
              summary={pipeline}
              isLoading={overview.isLoading}
              isError={overview.isError}
              onRetry={() => void overview.refetch()}
            />
          </Panel>

          <Panel flush>
            <PanelHeader title="Upcoming deadlines" />
            <UpcomingDeadlines
              rows={deadlineItems ?? []}
              isLoading={overview.isLoading}
              isError={overview.isError}
              onRetry={() => void overview.refetch()}
              onOpen={(opportunity) => setSelectedId(opportunity.id)}
            />
          </Panel>
        </div>
      </div>

      <OpportunityDrawer
        opportunityId={selectedId}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        contextLabel="Overview"
      />
    </div>
  )
}

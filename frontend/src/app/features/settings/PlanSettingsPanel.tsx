import { useQuery } from '@tanstack/react-query'

import { Panel, PanelHeader } from '@/app/components/layout/Panel'
import { SUPPORT_CONTACTS } from '@/app/config/supportContacts'
import { queryKeys } from '@/app/services/queryKeys'
import { getWorkspacePlan } from '@/app/services/workspace'

function formatEndsAt(raw: string | null | undefined): string {
  if (!raw) return '—'
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`
  const date = new Date(withZone)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatRemaining(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  if (seconds <= 0) return 'Ended'
  const total = Math.floor(seconds)
  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3_600)
  const minutes = Math.floor((total % 3_600) / 60)
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${Math.max(1, minutes)}m left`
}

function formatCooldown(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

export function PlanSettingsPanel() {
  const planQuery = useQuery({
    queryKey: queryKeys.workspacePlan(),
    queryFn: getWorkspacePlan,
    refetchInterval: 60_000,
  })

  const data = planQuery.data
  const trial = data?.trial
  const onFreeTrial = Boolean(trial?.applies)
  const expired = Boolean(trial?.expired)
  const planLabel = data?.is_demo
    ? 'Demo'
    : data?.plan === 'paid'
      ? 'Paid'
      : 'Free trial'

  return (
    <Panel flush>
      <PanelHeader
        title="Plan & limits"
        description={
          data == null
            ? 'Loading your plan…'
            : onFreeTrial
              ? expired
                ? 'Your free trial has ended. Contact support to upgrade.'
                : `Free trial lasts ${trial?.days ?? 2} days from signup. Limits below apply while it is active.`
              : data.plan === 'paid'
                ? 'Paid plan — no trial clock. Limits for your workspace.'
                : 'Your workspace plan and usage limits.'
        }
      />

      <div className="space-y-5 px-4 py-4 sm:px-5">
        {planQuery.isError && (
          <p className="text-sm text-hot-strong">Could not load plan details. Try again shortly.</p>
        )}

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-surface-sunken/40 px-3 py-2.5">
            <dt className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
              Current plan
            </dt>
            <dd className="mt-1 text-[14px] font-medium text-ink">{planLabel}</dd>
          </div>
          <div className="rounded-md border border-line bg-surface-sunken/40 px-3 py-2.5">
            <dt className="text-[11px] font-medium tracking-wide text-ink-muted uppercase">
              Team seats
            </dt>
            <dd className="mt-1 text-[14px] font-medium text-ink">
              {data != null
                ? `${data.seats_used} of ${data.seat_limit} used`
                : '—'}
            </dd>
          </div>
        </dl>

        {onFreeTrial && (
          <div
            className={
              expired
                ? 'rounded-md border border-hot-strong/30 bg-hot-strong/5 px-3 py-3'
                : 'rounded-md border border-line bg-forest-50/60 px-3 py-3'
            }
          >
            <p className="text-[12px] font-medium tracking-wide text-ink-muted uppercase">
              Free trial
            </p>
            <p className="mt-1 text-[15px] font-semibold text-ink">
              {expired ? 'Access ended' : formatRemaining(trial?.seconds_remaining)}
            </p>
            <p className="mt-1 text-[13px] text-ink-secondary">
              Ends {formatEndsAt(trial?.ends_at)}
            </p>
            {expired && (
              <p className="mt-2 text-[13px] text-ink-secondary">
                Sign-in is locked until your workspace is upgraded to paid. Reach out to support:
              </p>
            )}
          </div>
        )}

        <div>
          <h3 className="text-[12px] font-medium tracking-wide text-ink-muted uppercase">
            What you can use
          </h3>
          <ul className="mt-2 divide-y divide-line rounded-md border border-line">
            <li className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13.5px]">
              <span className="text-ink-secondary">Team seats</span>
              <span className="font-medium text-ink">
                {data?.limits.team_seats ?? '—'}
                {data?.paid_comparison && data.plan !== 'paid' ? (
                  <span className="ml-1.5 font-normal text-ink-muted">
                    (paid: {data.paid_comparison.seat_limit})
                  </span>
                ) : null}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13.5px]">
              <span className="text-ink-secondary">Radar runs per day</span>
              <span className="font-medium text-ink">
                {data?.limits.radar_runs_per_day ?? '—'}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13.5px]">
              <span className="text-ink-secondary">Radar cooldown</span>
              <span className="font-medium text-ink">
                {data != null
                  ? formatCooldown(data.limits.radar_cooldown_minutes)
                  : '—'}
              </span>
            </li>
          </ul>
        </div>

        {(onFreeTrial || expired) && (
          <div className="text-[13px] text-ink-secondary">
            <p className="font-medium text-ink">Need paid access?</p>
            <ul className="mt-1.5 space-y-1">
              {SUPPORT_CONTACTS.slice(0, 2).map((c) => (
                <li key={c.email}>
                  <a className="text-forest-800 underline-offset-2 hover:underline" href={`mailto:${c.email}`}>
                    {c.name}
                  </a>
                  <span className="text-ink-muted"> · {c.email}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  )
}

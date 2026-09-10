import { Check, ChevronDown, Info, Mail, Send, UserPlus } from 'lucide-react'

import { UserAvatar } from '@/app/components/common/Avatar'
import { Button } from '@/app/components/common/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/common/DropdownMenu'
import { channelLabel, outreachStatusMeta } from '@/app/constants/opportunity'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import type { Opportunity } from '@/app/types'
import { formatDateTimeFull, formatRelative, getTimezoneLabel } from '@/app/utils/date'
import { firstNameOf } from '@/app/utils/format'
import { canSendOutreach } from '@/app/utils/opportunity'

interface OpportunityActionBarProps {
  opportunity: Opportunity
  onAssignToMe: () => void
  onReassign: (userId: string) => void
  onUnassign: () => void
  onSendOutreach: () => void
  onReviewOutreach: () => void
  isAssigning?: boolean
}

/**
 * Ownership and outreach state plus the two primary actions. The duplicate
 * outreach notice sits directly above the buttons so it cannot be missed.
 */
export function OpportunityActionBar({
  opportunity,
  onAssignToMe,
  onReassign,
  onUnassign,
  onSendOutreach,
  onReviewOutreach,
  isAssigning,
}: OpportunityActionBarProps) {
  const { user, team, can } = useCurrentUser()

  const ownedByMe = opportunity.assignedToId === user.id
  const ownedByOther = Boolean(opportunity.assignedToId) && !ownedByMe
  const contactedByOther =
    Boolean(opportunity.lastContactedAt) && opportunity.lastContactedById !== user.id
  const emailAvailable = canSendOutreach(opportunity)

  return (
    <div className="space-y-3 border-b border-line bg-surface-muted px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-subtle uppercase">
            Owner
          </p>
          {opportunity.assignedToName ? (
            <div className="mt-1.5 flex items-center gap-2">
              <UserAvatar
                name={opportunity.assignedToName}
                tone={ownedByMe ? user.avatarTone : undefined}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-ink">
                  {ownedByMe ? `${opportunity.assignedToName} (you)` : opportunity.assignedToName}
                </p>
                {opportunity.assignedAt && (
                  <p
                    className="text-[12px] text-ink-muted"
                    title={formatDateTimeFull(opportunity.assignedAt)}
                  >
                    Assigned {formatRelative(opportunity.assignedAt)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-[13.5px] text-ink-muted">Unassigned</p>
          )}
        </div>

        <div>
          <p className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-subtle uppercase">
            Last contacted
          </p>
          {opportunity.lastContactedAt ? (
            <div className="mt-1.5">
              <p className="text-[13.5px] font-medium text-ink">
                {opportunity.lastContactedByName}
              </p>
              <p className="nums text-[12px] text-ink-muted">
                {formatDateTimeFull(opportunity.lastContactedAt)}
                <span className="ml-1.5 text-ink-subtle">{getTimezoneLabel()}</span>
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-[13.5px] text-ink-muted">Not contacted yet</p>
          )}
        </div>
      </div>

      {ownedByOther && (
        <p className="flex items-start gap-2 rounded-md border border-line bg-surface px-3 py-2 text-[12.5px] text-ink-secondary">
          <Info className="mt-px size-3.5 shrink-0 text-ink-muted" aria-hidden />
          <span>
            {firstNameOf(opportunity.assignedToName ?? '')} is currently working on this
            opportunity.
          </span>
        </p>
      )}

      {contactedByOther && (
        <div className="rounded-md border border-forest-100 bg-info-soft px-3 py-2.5">
          <p className="flex items-start gap-2 text-[12.5px] font-medium text-forest-800">
            <Mail className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>
              {opportunity.lastContactedByName} contacted this opportunity{' '}
              {formatRelative(opportunity.lastContactedAt)}.
            </span>
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 pl-5 text-[12px] text-ink-secondary sm:grid-cols-3">
            <div>
              <dt className="text-ink-muted">Team member</dt>
              <dd className="font-medium text-ink">{opportunity.lastContactedByName}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Channel</dt>
              <dd className="font-medium text-ink">
                {channelLabel(opportunity.lastContactChannel ?? 'email')}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Status</dt>
              <dd className="font-medium text-ink">
                {outreachStatusMeta(opportunity.outreachStatus).label}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-ink-muted">Sent</dt>
              <dd className="nums font-medium text-ink">
                {formatDateTimeFull(opportunity.lastContactedAt)}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={onReviewOutreach}
            className="mt-2 ml-5 text-[12.5px] font-medium text-signal-700 underline-offset-2 hover:underline"
          >
            Review previous outreach
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!opportunity.assignedToId ? (
          <Button
            variant="secondary"
            iconLeft={<UserPlus />}
            onClick={onAssignToMe}
            loading={isAssigning}
          >
            Assign to me
          </Button>
        ) : ownedByMe ? (
          <Button variant="secondary" iconLeft={<Check />} disabled>
            Assigned to you
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" iconRight={<ChevronDown />}>
                Assigned to {opportunity.assignedToName}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Assignment</DropdownMenuLabel>
              <DropdownMenuItem onSelect={onReviewOutreach}>View assignment</DropdownMenuItem>
              {can.reassign && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Reassign to</DropdownMenuLabel>
                  {team
                    .filter((member) => member.id !== opportunity.assignedToId)
                    .map((member) => (
                      <DropdownMenuItem
                        key={member.id}
                        onSelect={() => onReassign(member.id)}
                        icon={<UserAvatar name={member.name} tone={member.avatarTone} size="xs" />}
                      >
                        {member.id === user.id ? `${member.name} (you)` : member.name}
                      </DropdownMenuItem>
                    ))}
                </>
              )}
              {can.unassign && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={onUnassign}>
                    Unassign
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {opportunity.outreachStatus === 'not_contacted' ? (
          <Button
            variant="primary"
            iconLeft={<Send />}
            onClick={onSendOutreach}
            disabled={!emailAvailable}
            title={emailAvailable ? undefined : 'No verified email is available'}
          >
            Send Outreach
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onReviewOutreach}>
              View outreach
            </Button>
            <Button
              variant="primary"
              iconLeft={<Send />}
              onClick={onSendOutreach}
              disabled={!emailAvailable}
            >
              Send follow-up
            </Button>
          </>
        )}
      </div>

      {!emailAvailable && opportunity.type !== 'hiring' && (
        <p className="text-[12.5px] text-ink-muted">
          No verified email is available for this opportunity. Outreach is disabled until a contact
          is confirmed.
        </p>
      )}
      {!emailAvailable && opportunity.type === 'hiring' && (
        <p className="text-[12.5px] text-ink-muted">
          Enter a company or talent email in the composer to send outreach.
        </p>
      )}
    </div>
  )
}

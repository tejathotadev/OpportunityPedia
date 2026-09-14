import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { UserAvatar } from '@/app/components/common/Avatar'
import { Button } from '@/app/components/common/Button'
import { ConfirmationDialog, Dialog } from '@/app/components/common/Dialog'
import { Field, TextInput } from '@/app/components/forms/Field'
import { Panel, PanelHeader } from '@/app/components/layout/Panel'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { ApiError } from '@/app/services/api'
import { queryKeys } from '@/app/services/queryKeys'
import {
  inviteWorkspaceMember,
  listWorkspaceTeam,
  removeWorkspaceMember,
  type WorkspaceMember,
} from '@/app/services/workspace'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'

function seatRoleLabel(member: WorkspaceMember): string {
  const seat = (member.seat_role || 'owner').toLowerCase()
  if (member.status === 'pending_password') return 'Invite pending'
  if (member.status === 'provisioning') return 'Setting up'
  return seat === 'owner' ? 'Owner' : 'Member'
}

function avatarTone(index: number): 'teal' | 'navy' | 'plum' | 'sand' | 'slate' {
  const tones = ['teal', 'navy', 'plum', 'sand', 'slate'] as const
  return tones[index % tones.length]
}

export function TeamSettingsPanel() {
  const { user } = useCurrentUser()
  const profile = useAuthStore((s) => s.user?.profile)
  const qc = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null)
  const [inviteFallbackUrl, setInviteFallbackUrl] = useState<string | null>(null)

  const team = useQuery({
    queryKey: queryKeys.workspaceTeam(),
    queryFn: listWorkspaceTeam,
  })

  const invite = useMutation({
    mutationFn: () =>
      inviteWorkspaceMember({
        name: name.trim(),
        email: email.trim(),
      }),
    onSuccess: (row) => {
      setFormError(null)
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceTeam() })
      if (row.email_sent) {
        toast.success(`Invite sent to ${row.email}`)
        setInviteOpen(false)
        setName('')
        setEmail('')
        setInviteFallbackUrl(null)
      } else {
        setInviteFallbackUrl(row.setup_url ?? null)
        toast.info('User created, but email could not be sent. Share the setup link below.')
      }
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not send invite.')
    },
  })

  const remove = useMutation({
    mutationFn: (memberId: number | string) => removeWorkspaceMember(memberId),
    onSuccess: () => {
      setRemoveTarget(null)
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceTeam() })
      toast.success('Teammate removed')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove teammate.')
    },
  })

  const data = team.data
  const members = data?.members ?? []
  const canInvite = Boolean(data?.can_invite)
  const isOwner = (profile?.seat_role || 'owner').toLowerCase() === 'owner'
  const seatsLabel =
    data != null
      ? `${data.seats_used} of ${data.seat_limit} seats used · ${data.plan} plan`
      : 'Loading seats…'

  return (
    <>
      <Panel flush>
        <PanelHeader
          title="Team"
          description={
            <>
              People with access to this workspace.
              <span className="mt-1 block text-[12.5px] text-ink-muted">{seatsLabel}</span>
            </>
          }
          action={
            isOwner ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={!canInvite && Boolean(data)}
                title={
                  canInvite
                    ? undefined
                    : data
                      ? 'Seat limit reached for your plan'
                      : undefined
                }
                onClick={() => {
                  setFormError(null)
                  setInviteFallbackUrl(null)
                  setInviteOpen(true)
                }}
              >
                Invite member
              </Button>
            ) : null
          }
        />

        {team.isLoading ? (
          <p className="px-4 py-8 text-center text-[13px] text-ink-muted">Loading team…</p>
        ) : team.isError ? (
          <div className="px-4 py-6 text-center">
            <p className="text-[13px] text-danger">Could not load team members.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => void team.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {members.map((member, index) => {
              const isYou = String(member.id) === String(user.id)
              const isMemberSeat = (member.seat_role || '').toLowerCase() === 'member'
              return (
                <li key={String(member.id)} className="flex items-center gap-3 px-4 py-3">
                  <UserAvatar name={member.name} tone={avatarTone(index)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {isYou ? `${member.name} (you)` : member.name}
                    </p>
                    <p className="truncate text-[12.5px] text-ink-muted">{member.email}</p>
                  </div>
                  <span className="shrink-0 text-[13px] text-ink-secondary">
                    {seatRoleLabel(member)}
                  </span>
                  {isOwner && isMemberSeat && !isYou ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-danger hover:text-danger"
                      onClick={() => setRemoveTarget(member)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) {
            setFormError(null)
            setInviteFallbackUrl(null)
          }
        }}
        title="Invite teammate"
        description={
          data
            ? `Free and paid seats are managed on your plan. You have ${data.seats_remaining} seat${data.seats_remaining === 1 ? '' : 's'} left.`
            : 'They get a set-password email and join this workspace.'
        }
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={invite.isPending}
              disabled={!name.trim() || !email.trim()}
              onClick={() => invite.mutate()}
            >
              Send invite
            </Button>
          </>
        }
      >
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            invite.mutate()
          }}
        >
          <Field label="Full name" htmlFor="invite-name">
            <TextInput
              id="invite-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </Field>
          <Field label="Work email" htmlFor="invite-email">
            <TextInput
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </Field>
          {formError ? <p className="text-[13px] text-danger">{formError}</p> : null}
          {inviteFallbackUrl ? (
            <p className="break-all rounded-md border border-line bg-surface-muted px-3 py-2 font-mono text-[12px] text-ink-secondary">
              {inviteFallbackUrl}
            </p>
          ) : null}
        </form>
      </Dialog>

      <ConfirmationDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
        title="Remove teammate?"
        description={
          removeTarget
            ? `${removeTarget.name} (${removeTarget.email}) will lose access immediately. This frees a seat on your plan.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeTarget) remove.mutate(removeTarget.id)
        }}
      />
    </>
  )
}

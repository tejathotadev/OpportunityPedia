import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Lock, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/app/components/common/Button'
import { Dialog } from '@/app/components/common/Dialog'
import { Field, TextArea, TextInput } from '@/app/components/forms/Field'
import { useOpportunityMutations } from '@/app/hooks/useOpportunityMutations'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import type { Opportunity } from '@/app/types'
import { formatRelative } from '@/app/utils/date'
import { canSendOutreach } from '@/app/utils/opportunity'
import { cn } from '@/shared/cn'

import {
  OUTREACH_DRAFT_STYLES,
  buildOutreachDraft,
  defaultOutreachDraftStyle,
  type OutreachDraftStyle,
} from './template'

const schema = z.object({
  to: z
    .string()
    .trim()
    .min(1, 'A recipient is required.')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'),
  subject: z.string().trim().min(3, 'Add a subject line.'),
  body: z.string().trim().min(20, 'Write a message before sending.'),
})

type ComposerValues = z.infer<typeof schema>

interface EmailComposerProps {
  opportunity: Opportunity
  open: boolean
  onOpenChange: (open: boolean) => void
}

function filterContextLabel(opportunity: Opportunity): string | null {
  const filters = opportunity.hiringFilters
  if (!filters) return null
  const parts = [
    ...(filters.teams ?? []),
    ...(filters.locations ?? []),
    ...(filters.flexibilities ?? []),
  ]
    .map((v) => v.trim())
    .filter(Boolean)
  if (!parts.length) return null
  const count = opportunity.signalCount ?? opportunity.totalOpeningCount
  const countBit =
    typeof count === 'number' && count > 0
      ? ` · ${count} matching role${count === 1 ? '' : 's'}`
      : ''
  if (parts.length <= 3) return `${parts.join(' · ')}${countBit}`
  return `${parts.slice(0, 2).join(' · ')} +${parts.length - 2}${countBit}`
}

function DraftStyleList({
  draftStyle,
  onSelect,
  orientation,
}: {
  draftStyle: OutreachDraftStyle
  onSelect: (style: OutreachDraftStyle) => void
  orientation: 'side' | 'row'
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Draft style"
      className={cn(
        orientation === 'side' ? 'flex flex-col gap-1.5' : 'flex gap-2 overflow-x-auto pb-0.5',
      )}
    >
      {OUTREACH_DRAFT_STYLES.map((style) => {
        const active = draftStyle === style.id
        return (
          <button
            key={style.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(style.id)}
            className={cn(
              'rounded-lg border text-left transition-colors',
              orientation === 'side'
                ? 'px-3 py-2.5'
                : 'min-w-[9.5rem] shrink-0 px-3 py-2',
              active
                ? 'border-signal-300 bg-signal-50'
                : 'border-line bg-surface hover:border-line-strong hover:bg-surface-sunken',
            )}
          >
            <span
              className={cn(
                'block text-[13px] font-medium',
                active ? 'text-signal-800' : 'text-ink',
              )}
            >
              {style.label}
            </span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-muted">
              {style.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function EmailComposer({ opportunity, open, onOpenChange }: EmailComposerProps) {
  const { user } = useCurrentUser()
  const { outreach } = useOpportunityMutations()
  const emailAvailable = canSendOutreach(opportunity)
  const initialStyle = useMemo(() => defaultOutreachDraftStyle(opportunity), [opportunity])
  const [draftStyle, setDraftStyle] = useState<OutreachDraftStyle>(initialStyle)

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<ComposerValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      to: opportunity.contact?.email ?? '',
      ...buildOutreachDraft(opportunity, user, initialStyle),
    },
  })

  useEffect(() => {
    if (!open) return
    const style = defaultOutreachDraftStyle(opportunity)
    setDraftStyle(style)
    reset({
      to: opportunity.contact?.email ?? '',
      ...buildOutreachDraft(opportunity, user, style),
    })
  }, [open, opportunity, user, reset])

  const applyStyle = (style: OutreachDraftStyle) => {
    if (style === draftStyle) return
    if (isDirty) {
      const replace = window.confirm(
        'Replace the current message with this draft style? Your edits will be lost.',
      )
      if (!replace) return
    }
    setDraftStyle(style)
    const draft = buildOutreachDraft(opportunity, user, style)
    reset({
      to: getValues('to'),
      subject: draft.subject,
      body: draft.body,
    })
  }

  const contactedByOther =
    Boolean(opportunity.lastContactedAt) && opportunity.lastContactedById !== user.id
  const contextLabel = filterContextLabel(opportunity)

  const onSubmit = handleSubmit((values) => {
    outreach.mutate(
      {
        opportunityId: opportunity.id,
        from: user.email,
        to: values.to,
        subject: values.subject,
        body: values.body,
        channel: 'email',
      },
      { onSuccess: () => onOpenChange(false) },
    )
  })

  const notices = (
    <>
      {!emailAvailable && opportunity.type !== 'hiring' && (
        <p className="rounded-md border border-warm-line bg-warm-soft px-3 py-2 text-[13px] text-warm-strong">
          No verified email is available for this opportunity.
        </p>
      )}

      {!emailAvailable && opportunity.type === 'hiring' && (
        <p className="rounded-md border border-forest-100 bg-info-soft px-3 py-2 text-[13px] text-forest-800">
          No published hiring contact on this signal. Enter the company or talent email in To
          before sending.
        </p>
      )}

      {contactedByOther && (
        <p className="flex items-start gap-2 rounded-md border border-forest-100 bg-info-soft px-3 py-2 text-[12.5px] text-forest-800">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            {opportunity.lastContactedByName} contacted this opportunity{' '}
            {formatRelative(opportunity.lastContactedAt)}. Review that message before sending
            another so the company is not contacted twice.
          </span>
        </p>
      )}
    </>
  )

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      bodyClassName="flex min-h-0 flex-col overflow-hidden !p-0 sm:min-h-[32rem]"
      title="Send outreach"
      description={
        <span className="block">
          <span className="font-medium text-ink-secondary">{opportunity.companyName}</span>
          <span className="mx-1.5 text-line-strong">·</span>
          {opportunity.title}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            iconLeft={<Send />}
            onClick={onSubmit}
            loading={outreach.isPending}
            disabled={!emailAvailable}
          >
            Send Outreach
          </Button>
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Mobile: compact horizontal styles so the message stays primary. */}
        <div className="shrink-0 border-b border-line px-4 py-3 md:hidden">
          <p className="mb-2 text-[11.5px] font-semibold tracking-[0.04em] text-ink-subtle uppercase">
            Draft style
          </p>
          <DraftStyleList
            draftStyle={draftStyle}
            onSelect={applyStyle}
            orientation="row"
          />
        </div>

        {/* Desktop: side rail keeps styles visible without stealing message height. */}
        <aside className="hidden w-[13.5rem] shrink-0 flex-col border-r border-line bg-surface-muted/40 md:flex">
          <div className="border-b border-line px-3 py-3">
            <p className="text-[11.5px] font-semibold tracking-[0.04em] text-ink-subtle uppercase">
              Draft style
            </p>
            <p className="mt-1 text-[12px] leading-snug text-ink-muted">
              Starting point — edit freely.
            </p>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-2.5">
            <DraftStyleList
              draftStyle={draftStyle}
              onSelect={applyStyle}
              orientation="side"
            />
          </div>
          {contextLabel && (
            <div className="border-t border-line px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-subtle uppercase">
                Focus
              </p>
              <p className="mt-1 text-[12px] leading-snug text-ink-secondary">{contextLabel}</p>
            </div>
          )}
        </aside>

        <div className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-4">
          <form onSubmit={onSubmit} className="flex min-h-full flex-col gap-4">
            <div className="space-y-3">{notices}</div>

            {contextLabel && (
              <p className="rounded-md border border-line bg-surface-sunken px-3 py-2 text-[12.5px] text-ink-secondary md:hidden">
                Focus: {contextLabel}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From" hint="Sender identity comes from your signed-in account.">
                <div className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface-sunken px-2.5 text-[13px] text-ink-secondary">
                  <Lock className="size-3.5 shrink-0 text-ink-subtle" aria-hidden />
                  <span className="truncate">
                    {user.name} <span className="text-ink-muted">&lt;{user.email}&gt;</span>
                  </span>
                </div>
              </Field>

              <Field label="To" htmlFor="outreach-to" required error={errors.to?.message}>
                <TextInput
                  id="outreach-to"
                  type="email"
                  autoComplete="off"
                  placeholder="name@company.com"
                  invalid={Boolean(errors.to)}
                  disabled={!emailAvailable && opportunity.type !== 'hiring'}
                  {...register('to')}
                />
              </Field>
            </div>

            <Field
              label="Subject"
              htmlFor="outreach-subject"
              required
              error={errors.subject?.message}
            >
              <TextInput
                id="outreach-subject"
                invalid={Boolean(errors.subject)}
                {...register('subject')}
              />
            </Field>

            <Field
              label="Message"
              htmlFor="outreach-body"
              required
              error={errors.body?.message}
              hint={
                draftStyle === 'custom'
                  ? 'Custom starts nearly blank — write in your own voice.'
                  : isDirty
                    ? undefined
                    : 'Edit the draft before sending — it is a starting point.'
              }
              className="flex min-h-0 flex-1 flex-col"
            >
              <TextArea
                id="outreach-body"
                rows={14}
                className="min-h-[16rem] flex-1 font-sans text-[13.5px] leading-relaxed md:min-h-[18rem]"
                invalid={Boolean(errors.body)}
                {...register('body')}
              />
            </Field>
          </form>
        </div>
      </div>
    </Dialog>
  )
}

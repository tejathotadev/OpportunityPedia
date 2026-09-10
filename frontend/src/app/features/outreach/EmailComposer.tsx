import { zodResolver } from '@hookform/resolvers/zod'
import { Info, Lock, Send } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/app/components/common/Button'
import { Dialog } from '@/app/components/common/Dialog'
import { Field, TextArea, TextInput } from '@/app/components/forms/Field'
import { useOpportunityMutations } from '@/app/hooks/useOpportunityMutations'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { toast } from '@/app/store/useToastStore'
import type { Opportunity } from '@/app/types'
import { formatRelative } from '@/app/utils/date'
import { canSendOutreach } from '@/app/utils/opportunity'

import { buildBody, buildSubject } from './template'

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

export function EmailComposer({ opportunity, open, onOpenChange }: EmailComposerProps) {
  const { user } = useCurrentUser()
  const { outreach } = useOpportunityMutations()
  const emailAvailable = canSendOutreach(opportunity)

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
      subject: buildSubject(opportunity, user),
      body: buildBody(opportunity, user),
    },
  })

  // Regenerate the draft whenever the composer is opened for an opportunity.
  useEffect(() => {
    if (open) {
      reset({
        to: opportunity.contact?.email ?? '',
        subject: buildSubject(opportunity, user),
        body: buildBody(opportunity, user),
      })
    }
  }, [open, opportunity, user, reset])

  const contactedByOther =
    Boolean(opportunity.lastContactedAt) && opportunity.lastContactedById !== user.id

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

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
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
            variant="secondary"
            onClick={() => {
              const values = getValues()
              if (!values.subject.trim() || !values.body.trim()) {
                toast.error('Add a subject and message before saving a draft.')
                return
              }
              toast.success('Draft saved.')
              onOpenChange(false)
            }}
          >
            Save draft
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
      {!emailAvailable && opportunity.type !== 'hiring' && (
        <p className="mb-4 rounded-md border border-warm-line bg-warm-soft px-3 py-2 text-[13px] text-warm-strong">
          No verified email is available for this opportunity.
        </p>
      )}

      {!emailAvailable && opportunity.type === 'hiring' && (
        <p className="mb-4 rounded-md border border-forest-100 bg-info-soft px-3 py-2 text-[13px] text-forest-800">
          No published hiring contact on this signal. Enter the company or talent email in To
          before sending.
        </p>
      )}

      {contactedByOther && (
        <p className="mb-4 flex items-start gap-2 rounded-md border border-forest-100 bg-info-soft px-3 py-2 text-[12.5px] text-forest-800">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            {opportunity.lastContactedByName} contacted this opportunity{' '}
            {formatRelative(opportunity.lastContactedAt)}. Review that message before sending
            another so the company is not contacted twice.
          </span>
        </p>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
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
              disabled={!emailAvailable}
              {...register('to')}
            />
          </Field>
        </div>

        <Field label="Subject" htmlFor="outreach-subject" required error={errors.subject?.message}>
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
          hint={isDirty ? undefined : 'Edit the draft before sending — it is a starting point.'}
        >
          <TextArea
            id="outreach-body"
            rows={14}
            className="min-h-[280px] font-sans text-[13.5px] leading-relaxed"
            invalid={Boolean(errors.body)}
            {...register('body')}
          />
        </Field>
      </form>
    </Dialog>
  )
}

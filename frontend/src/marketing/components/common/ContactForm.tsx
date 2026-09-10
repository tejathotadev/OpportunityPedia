import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check } from 'lucide-react';
import { Button, LinkButton } from '@/marketing/components/common/Button';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { submitContactForm } from '@/marketing/lib/submitContactForm';
import { contactFormSchema, contactReasons, type ContactFormValues } from '@/marketing/types/contact';
import { track } from '@/marketing/lib/analytics';
import { toast } from '@/app/store/useToastStore';
import { cn } from '@/shared/cn';

const fieldClasses =
  'w-full min-h-11 rounded-control border bg-white px-3.5 py-2.5 text-[0.9375rem] text-ink transition-colors placeholder:text-graphite/45';

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] text-temp-very-hot">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

/**
 * Contact form — React Hook Form + Zod.
 *
 * Submission posts to the backend contact API (`contact_leads` in Supabase).
 * Errors are wired to inputs with `aria-describedby` and
 * `aria-invalid` so they are announced rather than only coloured red.
 */
export function ContactForm() {
  const uid = useId();
  const [reference, setReference] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: 'onBlur',
    defaultValues: { reason: 'Product inquiry' },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitError(null);
    const result = await submitContactForm(values);

    if (result.ok) {
      track('contact_submit', { reason: values.reason });
      setReference(result.reference);
      reset();
      toast.success('Message sent', 'We will reply to the email you provided.');
    } else {
      setSubmitError(result.error);
      toast.error('Could not send', result.error);
    }
  };

  const fid = (name: string) => `${uid}-${name}`;
  const eid = (name: string) => `${uid}-${name}-error`;

  if (reference) {
    return (
      <div className="border border-mist bg-white p-6 md:p-8" role="status">
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center border border-signal/30 bg-signal/[0.08] text-signal-deep"
        >
          <Check className="size-5" />
        </span>
        <h3 className="mt-5 text-title font-semibold">Message received.</h3>
        <p className="mt-3 max-w-[34rem] text-[1.0625rem] leading-relaxed text-graphite">
          Thanks for reaching out. We read everything that comes through and will reply to the
          email address you provided.
        </p>
        <SignalIndex
          className="mt-6 border-t border-mist pt-5"
          entries={[
            { key: 'Reference', value: reference },
            { key: 'Status', value: 'Queued' },
          ]}
        />
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="secondary" onClick={() => setReference(null)}>
            Send another message
          </Button>
          <LinkButton to="/products/opportunitypedia" variant="tertiary" arrow="right">
            Explore OpportunityPedia
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="border border-mist bg-white p-6 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={fid('firstName')} className="label-meta text-ink">
            First name <span aria-hidden="true">*</span>
          </label>
          <input
            id={fid('firstName')}
            type="text"
            autoComplete="given-name"
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? eid('firstName') : undefined}
            className={cn(
              fieldClasses,
              'mt-2',
              errors.firstName ? 'border-temp-very-hot' : 'border-mist',
            )}
            {...register('firstName')}
          />
          <FieldError id={eid('firstName')} message={errors.firstName?.message} />
        </div>

        <div>
          <label htmlFor={fid('lastName')} className="label-meta text-ink">
            Last name <span aria-hidden="true">*</span>
          </label>
          <input
            id={fid('lastName')}
            type="text"
            autoComplete="family-name"
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? eid('lastName') : undefined}
            className={cn(
              fieldClasses,
              'mt-2',
              errors.lastName ? 'border-temp-very-hot' : 'border-mist',
            )}
            {...register('lastName')}
          />
          <FieldError id={eid('lastName')} message={errors.lastName?.message} />
        </div>

        <div>
          <label htmlFor={fid('email')} className="label-meta text-ink">
            Work email <span aria-hidden="true">*</span>
          </label>
          <input
            id={fid('email')}
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? eid('email') : undefined}
            className={cn(
              fieldClasses,
              'mt-2',
              errors.email ? 'border-temp-very-hot' : 'border-mist',
            )}
            {...register('email')}
          />
          <FieldError id={eid('email')} message={errors.email?.message} />
        </div>

        <div>
          <label htmlFor={fid('company')} className="label-meta text-ink">
            Company <span aria-hidden="true">*</span>
          </label>
          <input
            id={fid('company')}
            type="text"
            autoComplete="organization"
            aria-invalid={Boolean(errors.company)}
            aria-describedby={errors.company ? eid('company') : undefined}
            className={cn(
              fieldClasses,
              'mt-2',
              errors.company ? 'border-temp-very-hot' : 'border-mist',
            )}
            {...register('company')}
          />
          <FieldError id={eid('company')} message={errors.company?.message} />
        </div>

        <div>
          <label htmlFor={fid('role')} className="label-meta text-ink">
            Role <span className="normal-case">(optional)</span>
          </label>
          <input
            id={fid('role')}
            type="text"
            autoComplete="organization-title"
            className={cn(fieldClasses, 'mt-2 border-mist')}
            {...register('role')}
          />
        </div>

        <div>
          <label htmlFor={fid('reason')} className="label-meta text-ink">
            Reason for reaching out <span aria-hidden="true">*</span>
          </label>
          <select
            id={fid('reason')}
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={errors.reason ? eid('reason') : undefined}
            className={cn(
              fieldClasses,
              'mt-2 appearance-none bg-[length:0.65rem] bg-[right_0.9rem_center] bg-no-repeat pr-10',
              errors.reason ? 'border-temp-very-hot' : 'border-mist',
            )}
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23475569' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
            }}
            {...register('reason')}
          >
            {contactReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
          <FieldError id={eid('reason')} message={errors.reason?.message} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={fid('message')} className="label-meta text-ink">
            Message <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={fid('message')}
            rows={6}
            placeholder="How does your team find opportunities today?"
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? eid('message') : undefined}
            className={cn(
              fieldClasses,
              'mt-2 resize-y leading-relaxed',
              errors.message ? 'border-temp-very-hot' : 'border-mist',
            )}
            {...register('message')}
          />
          <FieldError id={eid('message')} message={errors.message?.message} />
        </div>
      </div>

      {submitError ? (
        <p role="alert" className="mt-5 flex items-start gap-2 text-[0.9375rem] text-temp-very-hot">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {submitError}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-4 border-t border-mist pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send message'}
        </Button>
        <p className="text-xs leading-relaxed text-graphite sm:max-w-[18rem]">
          Fields marked <span aria-hidden="true">*</span>
          <span className="sr-only">with an asterisk</span> are required.
        </p>
      </div>
    </form>
  );
}

import { type FormEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { Button } from '@/app/components/common/Button'
import { Field, TextInput } from '@/app/components/forms/Field'
import { ApiError } from '@/app/services/api'
import { signupFreePlan } from '@/app/services/auth'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'
import { BrandMark, OpportunityPediaMark } from '@/shared/brand/Logo'

/**
 * Public free-plan signup. Same pipeline as admin invite once the account exists.
 */
export default function FreeSignupPage() {
  const user = useAuthStore((s) => s.user)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [doneEmail, setDoneEmail] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  if (user?.token) {
    return <Navigate to="/app/overview" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signupFreePlan({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
      })
      setDoneEmail(result.email)
      setEmailSent(Boolean(result.email_sent))
      if (result.email_sent) {
        toast.success('Check your email', 'Open the link to create your password.')
      } else {
        toast.error('Email not sent', result.message)
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not start free plan signup.'
      setError(message)
      toast.error('Signup failed', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh bg-paper">
      <div
        aria-hidden="true"
        className="field-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]"
      />

      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-forest px-10 py-10 text-white lg:flex">
        <Link to="/" className="relative inline-flex items-center gap-3">
          <BrandMark tone="inverse" className="h-8" />
          <span className="text-lg font-semibold tracking-[-0.02em]">
            Opportunity<span className="text-teal">X</span>
          </span>
        </Link>
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-white/70">Free plan</p>
          <h1 className="mt-3 max-w-sm text-3xl font-semibold tracking-[-0.03em]">
            Start with OpportunityPedia.
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
            Fill in your details, create a password from your email, then we prepare your
            workspace.
          </p>
        </div>
        <p className="text-xs text-white/50">OpportunityPedia by OpportunityX</p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <OpportunityPediaMark />
          </div>

          {doneEmail ? (
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
                {emailSent ? 'Check your email' : 'Almost there'}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-graphite">
                {emailSent
                  ? `We sent a password link to ${doneEmail}. After you set your password, you will see the workspace setup screen.`
                  : `Your account for ${doneEmail} was saved, but the email could not be delivered. Contact support so we can resend the link.`}
              </p>
              <Link
                to="/login"
                className="mt-8 inline-block text-sm font-medium text-forest underline"
              >
                Already finished? Sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
                Start free plan
              </h1>
              <p className="mt-2 text-sm text-graphite">
                We will email you a link to create your password.
              </p>

              <form className="mt-8 space-y-4" onSubmit={onSubmit}>
                <Field label="Full name" htmlFor="free-name" required>
                  <TextInput
                    id="free-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Work email" htmlFor="free-email" required>
                  <TextInput
                    id="free-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Phone" htmlFor="free-phone" required>
                  <TextInput
                    id="free-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Company" htmlFor="free-company" required>
                  <TextInput
                    id="free-company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    required
                  />
                </Field>
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button type="submit" variant="primary" fullWidth loading={loading}>
                  Continue
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-graphite">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-forest underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

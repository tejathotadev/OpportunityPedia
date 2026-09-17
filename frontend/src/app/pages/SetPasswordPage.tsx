import { type FormEvent, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/app/components/common/Button'
import { Field, TextInput } from '@/app/components/forms/Field'
import { ApiError } from '@/app/services/api'
import { setCustomerPassword } from '@/app/services/auth'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'
import { BrandMark, OpportunityPediaMark } from '@/shared/brand/Logo'

/**
 * Completes an invite / free / payment setup link, then routes to workspace
 * wait (provisioning plans) or login (legacy immediate-active plans).
 */
export default function SetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = useMemo(() => (params.get('token') || '').trim(), [params])
  const user = useAuthStore((s) => s.user)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user?.token) {
    return <Navigate to="/app/overview" replace />
  }

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-6">
        <div className="w-full max-w-md rounded-lg border border-mist bg-white p-8 text-center">
          <OpportunityPediaMark className="mx-auto" />
          <h1 className="mt-6 text-xl font-semibold text-ink">Link missing</h1>
          <p className="mt-2 text-sm text-graphite">
            Open the set-password link from your email, or ask your admin to resend it.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm font-medium text-forest underline">
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const result = await setCustomerPassword(token, password)
      if (result.next === 'workspace_setup' || result.status === 'provisioning') {
        toast.success('Password saved', 'Setting up your workspace next.')
        navigate(`/workspace-setup?email=${encodeURIComponent(result.email)}`, {
          replace: true,
        })
        return
      }
      toast.success('Password saved', `You can sign in as ${result.email}.`)
      navigate('/login', { replace: true, state: { email: result.email } })
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'This link is invalid or expired.'
      setError(message)
      toast.error('Could not save password', message)
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
          <p className="text-sm uppercase tracking-[0.14em] text-white/70">Account setup</p>
          <h1 className="mt-3 max-w-sm text-3xl font-semibold tracking-[-0.03em]">
            Choose a password to continue.
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
            This link is valid for 24 hours. Next we finish setting up your workspace.
          </p>
        </div>
        <p className="text-xs text-white/50">OpportunityPedia by OpportunityX</p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <OpportunityPediaMark />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Create your password</h1>
          <p className="mt-2 text-sm text-graphite">
            Then we will finish preparing your workspace.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <Field label="Password" htmlFor="set-password" required>
              <TextInput
                id="set-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="h-11"
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </button>
                }
              />
            </Field>
            <Field label="Confirm password" htmlFor="set-password-confirm" required>
              <TextInput
                id="set-password-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
                className="h-11"
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowConfirm((value) => !value)}
                    className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-600"
                    aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    title={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirm ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                  </button>
                }
              />
            </Field>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Save password
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-graphite">
            Already set up?{' '}
            <Link to="/login" className="font-medium text-forest underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}

import { type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/app/components/common/Button'
import { Field, TextInput } from '@/app/components/forms/Field'
import { ApiError } from '@/app/services/api'
import { loginCustomer } from '@/app/services/auth'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'
import { BrandMark, OpportunityPediaMark } from '@/shared/brand/Logo'
import {
  consumeCustomerSignedOut,
  consumeSignedInElsewhere,
  CUSTOMER_HOME,
  peekCustomerSignedOut,
} from '@/app/utils/authRedirect'

/**
 * Customer sign-in. Wired to `POST /api/v1/auth/login`.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const setUserSession = useAuthStore((s) => s.setUserSession)

  const [email, setEmail] = useState(
    () => String((location.state as { email?: string } | null)?.email || ''),
  )
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (consumeSignedInElsewhere()) {
      toast.info('Signed in elsewhere', 'Your session ended because you signed in on another device.')
    }
  }, [])

  function resolvePostLoginPath(): string {
    // Explicit Sign out always returns to Overview (flag beats stale location.state).
    if (consumeCustomerSignedOut()) return CUSTOMER_HOME
    const raw = (location.state as { from?: string } | null)?.from
    if (raw && String(raw).startsWith('/app')) return String(raw)
    return CUSTOMER_HOME
  }

  if (user?.token) {
    // Peek only during render (no consume) so Strict Mode cannot clear the flag twice.
    const dest = peekCustomerSignedOut()
      ? CUSTOMER_HOME
      : (() => {
          const raw = (location.state as { from?: string } | null)?.from
          return raw && String(raw).startsWith('/app') ? String(raw) : CUSTOMER_HOME
        })()
    return <Navigate to={dest} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await loginCustomer(email.trim(), password)
      setUserSession({ token: result.token, profile: result.user })
      toast.success('Signed in', `Welcome back, ${result.user.name.split(' ')[0] || 'there'}.`)
      const dest = resolvePostLoginPath()
      navigate(dest, { replace: true })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sign-in failed. Try again.'
      setError(message)
      toast.error('Sign-in failed', message)
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

      {/* Brand panel — desktop */}
      <aside className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-forest px-10 py-10 text-white lg:flex xl:w-[46%] xl:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <Link to="/" className="relative inline-flex items-center gap-3">
          <BrandMark tone="inverse" className="h-8" />
          <span className="text-lg font-semibold tracking-[-0.02em]">
            Opportunity<span className="text-teal">X</span>
          </span>
        </Link>

        <div className="relative max-w-sm">
          <p className="text-[11px] font-medium tracking-[0.14em] text-white/55 uppercase">
            OpportunityPedia
          </p>
          <h2 className="mt-4 text-[2rem] leading-tight font-semibold tracking-[-0.03em]">
            See what matters.
            <span className="mt-1 block text-white/55">Act before it disappears.</span>
          </h2>
          <p className="mt-5 text-[0.975rem] leading-relaxed text-white/65">
            Sign in to your workspace to discover, prioritize and follow through on opportunities —
            in one place.
          </p>
        </div>

        <p className="relative text-sm text-white/45">We make opportunity easier to see.</p>
      </aside>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 px-6 py-5 md:px-10">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-graphite transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to home
          </button>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-[24rem]">
            <div className="mb-8 lg:hidden">
              <OpportunityPediaMark className="text-[1.35rem]" />
            </div>

            <p className="label-meta text-forest">OpportunityPedia</p>
            <h1 className="mt-3 text-[1.875rem] font-semibold tracking-[-0.03em] text-ink">
              Sign in
            </h1>
            <p className="mt-2 text-[0.975rem] leading-relaxed text-graphite">
              Enter your email and password to open your workspace.
            </p>

            <form
              onSubmit={onSubmit}
              className="mt-8 space-y-4 rounded-xl border border-mist bg-white p-6 shadow-[0_20px_50px_-36px_rgba(17,24,39,0.35)] md:p-7"
              noValidate
            >
              <Field label="Email" htmlFor="login-email" required>
                <TextInput
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </Field>
              <Field label="Password" htmlFor="login-password" required>
                <TextInput
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

              {error ? (
                <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-[13px] text-danger">
                  {error}
                </p>
              ) : null}

              <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
                Sign in
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-graphite">
              Don&rsquo;t have an account?{' '}
              <Link to="/contact" className="font-medium text-forest hover:underline">
                Talk to us
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

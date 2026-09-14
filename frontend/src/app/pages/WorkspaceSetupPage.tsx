import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/app/components/common/Button'
import { ApiError } from '@/app/services/api'
import { getProvisioningStatus } from '@/app/services/auth'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'
import { OpportunityPediaMark } from '@/shared/brand/Logo'

/**
 * Free (and later paid) wait screen. Polls until admin activates; unlocks early
 * when setup finishes — no forced 10-minute wait.
 */
export default function WorkspaceSetupPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = useMemo(() => (params.get('email') || '').trim().toLowerCase(), [params])
  const user = useAuthStore((s) => s.user)

  const [message, setMessage] = useState(
    'We are setting up your workspace. This usually takes about 10 minutes.',
  )
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!email || ready) return

    let cancelled = false
    let timer: number | undefined

    async function poll() {
      try {
        const status = await getProvisioningStatus(email)
        if (cancelled) return
        setMessage(status.message)
        setError(null)
        if (status.ready) {
          setReady(true)
          toast.success('Workspace ready', 'You can sign in now.')
          return
        }
      } catch (err) {
        if (cancelled) return
        const detail =
          err instanceof ApiError ? err.message : 'Could not check setup status.'
        setError(detail)
      }
      timer = window.setTimeout(poll, 5000)
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [email, ready])

  if (user?.token) {
    return <Navigate to="/app/overview" replace />
  }

  if (!email) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-6">
        <div className="w-full max-w-md rounded-lg border border-mist bg-white p-8 text-center">
          <OpportunityPediaMark className="mx-auto" />
          <h1 className="mt-6 text-xl font-semibold text-ink">Setup link incomplete</h1>
          <p className="mt-2 text-sm text-graphite">
            Return to the set-password email flow, or sign in if your workspace is already ready.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm font-medium text-forest underline">
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-paper px-6">
      <div
        aria-hidden="true"
        className="field-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <div className="relative w-full max-w-lg rounded-lg border border-mist bg-white p-8 text-center shadow-sm">
        <OpportunityPediaMark className="mx-auto" />
        <p className="mt-6 text-sm uppercase tracking-[0.14em] text-forest">Workspace setup</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-ink">
          {ready ? 'Your workspace is ready' : 'Setting up your workspace'}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-graphite">{message}</p>
        <p className="mt-2 text-xs text-ink-secondary">{email}</p>

        {!ready ? (
          <div className="mx-auto mt-8 h-1.5 w-40 overflow-hidden rounded-full bg-mist">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-forest" />
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

        <div className="mt-8 flex flex-col items-center gap-3">
          {ready ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => navigate('/login', { replace: true, state: { email } })}
            >
              Continue to sign in
            </Button>
          ) : (
            <p className="max-w-sm text-xs leading-relaxed text-ink-secondary">
              You will get access as soon as setup finishes — no need to wait the full estimate if
              it completes earlier.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

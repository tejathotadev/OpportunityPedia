import { type FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { Button } from '@/app/components/common/Button'
import { ApiError } from '@/app/services/api'
import { loginAdmin } from '@/app/services/auth'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'

/**
 * Hidden admin entry — `/admin/login`. Intentionally not linked from the
 * marketing site or product nav.
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()
  const admin = useAuthStore((s) => s.admin)
  const setAdminSession = useAuthStore((s) => s.setAdminSession)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (admin?.token) {
    return <Navigate to="/admin/users" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await loginAdmin(email.trim(), password)
      setAdminSession({ token: result.token, profile: result.user })
      toast.success('Admin signed in')
      navigate('/admin/users', { replace: true })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sign-in failed. Try again.'
      setError(message)
      toast.error('Sign-in failed', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink px-6 py-16">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-navy-deep p-8">
        <p className="text-[11px] font-medium tracking-[0.12em] text-teal uppercase">
          Platform admin
        </p>
        <h1 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-white">Sign in</h1>
        <p className="mt-2 text-sm text-white/55">
          Monitor accounts on OpportunityPedia. This page is not listed on the public site.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="admin-email" className="block text-[13px] font-medium text-white/70">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="admin-password" className="block text-[13px] font-medium text-white/70">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-10 w-full rounded-md border border-white/15 bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/30 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-[13px] text-red-200">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}

import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { RequireAdminAuth } from '@/app/components/auth/RequireAdminAuth'
import { Button } from '@/app/components/common/Button'
import { ApiError } from '@/app/services/api'
import {
  createAdminUser,
  listAdminLeads,
  listAdminUsers,
  updateAdminLead,
  type AdminLeadRow,
} from '@/app/services/auth'
import { useAuthStore } from '@/app/store/useAuthStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium',
    isActive ? 'bg-paper-warm text-ink' : 'text-ink hover:bg-paper-warm',
  ].join(' ')

function AdminShell() {
  const navigate = useNavigate()
  const admin = useAuthStore((s) => s.admin)
  const clearAdminSession = useAuthStore((s) => s.clearAdminSession)

  function signOut() {
    clearAdminSession()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="border-b border-mist bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="label-meta text-forest">OpportunityX · Admin</p>
            <p className="mt-0.5 text-sm text-graphite">{admin?.profile.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/admin/leads" className={navLinkClass}>
              Leads
            </NavLink>
            <NavLink to="/admin/users" className={navLinkClass}>
              Users
            </NavLink>
            <Button type="button" variant="secondary" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}

export function AdminUsersPage() {
  const token = useAuthStore((s) => s.admin?.token)
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<{
    email: string
    emailSent: boolean
    setupUrl: string | null
  } | null>(null)

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => listAdminUsers(token!),
    enabled: Boolean(token),
  })

  const create = useMutation({
    mutationFn: () =>
      createAdminUser(token!, {
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    onSuccess: (row) => {
      setFormError(null)
      setInviteResult({
        email: row.email,
        emailSent: Boolean(row.email_sent),
        setupUrl: row.setup_url ?? null,
      })
      setName('')
      setEmail('')
      setCompany('')
      setPhone('')
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not create user.'
      setFormError(message)
      setInviteResult(null)
    },
  })

  return (
    <div>
      <h1 className="text-[1.5rem] font-semibold tracking-[-0.025em] text-ink">Users</h1>
      <p className="mt-2 max-w-2xl text-[0.9375rem] text-graphite">
        Invite customers by email. They receive a link to set their own password, then sign in at{' '}
        <span className="font-medium text-ink">/login</span>.
      </p>

      <div className="mt-8 rounded-md border border-mist bg-white p-5">
        <h2 className="text-sm font-semibold text-ink">Invite user</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            setFormError(null)
            create.mutate()
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 w-full rounded-md border border-mist bg-paper px-3 text-ink"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 w-full rounded-md border border-mist bg-paper px-3 text-ink"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">Company</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-9 w-full rounded-md border border-mist bg-paper px-3 text-ink"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink-secondary">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 w-full rounded-md border border-mist bg-paper px-3 text-ink"
            />
          </label>
          {formError ? (
            <p className="sm:col-span-2 text-sm text-danger">{formError}</p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" size="sm" loading={create.isPending}>
              Send invite
            </Button>
          </div>
        </form>

        {inviteResult ? (
          <div className="mt-4 rounded-md border border-forest/20 bg-forest/5 px-4 py-3 text-sm text-ink">
            {inviteResult.emailSent ? (
              <p className="font-medium">
                Invite sent to {inviteResult.email}. They set a password from the email link, then
                sign in at /login.
              </p>
            ) : (
              <>
                <p className="font-medium">
                  User created for {inviteResult.email}, but email could not be sent.
                </p>
                {inviteResult.setupUrl ? (
                  <p className="mt-2 break-all font-mono text-[12px] text-graphite">
                    Share this link: {inviteResult.setupUrl}
                  </p>
                ) : (
                  <p className="mt-2 text-graphite">
                    Check SMTP settings, then use resend-setup for this email.
                  </p>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>

      {users.isLoading ? (
        <p className="mt-10 text-sm text-graphite">Loading users…</p>
      ) : users.isError ? (
        <div className="mt-10 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          Could not load users. Check that the admin API is running, then refresh.
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => users.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : !users.data?.length ? (
        <p className="mt-10 rounded-md border border-mist bg-white px-4 py-8 text-center text-sm text-graphite">
          No users yet. Create the first customer above.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-md border border-mist bg-white">
          <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-paper">
                <th className="px-4 py-3 font-medium text-ink-secondary">Name</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Email</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Company</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Status</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {users.data.map((row) => (
                <tr key={String(row.id)} className="align-top">
                  <td className="px-4 py-3 font-medium text-ink">
                    {row.name}
                    {row.is_demo ? (
                      <span className="ml-2 text-xs font-normal text-forest">demo</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-graphite">{row.email}</td>
                  <td className="px-4 py-3 text-graphite">{row.company || '—'}</td>
                  <td className="px-4 py-3 text-graphite">{row.status}</td>
                  <td className="px-4 py-3 text-graphite">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const LEAD_STATUSES = ['new', 'in_progress', 'contacted', 'closed'] as const

export function AdminLeadsPage() {
  const token = useAuthStore((s) => s.admin?.token)
  const qc = useQueryClient()

  const leads = useQuery({
    queryKey: ['admin', 'leads'],
    queryFn: () => listAdminLeads(token!),
    enabled: Boolean(token),
  })

  const update = useMutation({
    mutationFn: (args: { id: AdminLeadRow['id']; status: string }) =>
      updateAdminLead(token!, args.id, { status: args.status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'leads'] }),
  })

  return (
    <div>
      <h1 className="text-[1.5rem] font-semibold tracking-[-0.025em] text-ink">Contact leads</h1>
      <p className="mt-2 max-w-2xl text-[0.9375rem] text-graphite">
        Messages from the public contact form. Stored in Supabase `contact_leads`.
      </p>

      {leads.isLoading ? (
        <p className="mt-10 text-sm text-graphite">Loading leads…</p>
      ) : leads.isError ? (
        <div className="mt-10 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          Could not load leads. Check that the API and DATABASE_URL are set.
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => leads.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : !leads.data?.length ? (
        <p className="mt-10 rounded-md border border-mist bg-white px-4 py-8 text-center text-sm text-graphite">
          No leads yet. Submit the marketing contact form to create one.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {leads.data.map((row) => (
            <article key={String(row.id)} className="rounded-md border border-mist bg-white px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{row.name}</p>
                  <p className="mt-0.5 text-sm text-graphite">
                    {row.email}
                    {row.company ? ` · ${row.company}` : ''}
                    {row.job_title ? ` · ${row.job_title}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    {row.reason}
                    {row.created_at
                      ? ` · ${new Date(row.created_at).toLocaleString()}`
                      : ''}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-graphite">
                  <span className="sr-only">Status</span>
                  <select
                    className="rounded-md border border-mist bg-paper px-2 py-1.5 text-sm text-ink"
                    value={row.status}
                    disabled={update.isPending}
                    onChange={(e) => update.mutate({ id: row.id, status: e.target.value })}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                {row.message}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

/** Lazy entry for `/admin/*` (except login). */
export default function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <RequireAdminAuth>
        <AdminShell />
      </RequireAdminAuth>
    </QueryClientProvider>
  )
}

export function AdminIndexRedirect() {
  return <Navigate to="/admin/leads" replace />
}

import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { RequireAdminAuth } from '@/app/components/auth/RequireAdminAuth'
import { Button } from '@/app/components/common/Button'
import { ApiError } from '@/app/services/api'
import {
  activateAdminUser,
  createAdminUser,
  getUserNaicsCoverage,
  listAdminLeads,
  listAdminUsers,
  listNaicsCatalog,
  removeAdminUser,
  restoreAdminUser,
  setAdminUserPlan,
  setUserNaicsCoverage,
  updateAdminLead,
  type AdminLeadRow,
  type AdminUserRow,
} from '@/app/services/auth'
import { getAdminUserRadarRuns } from '@/app/services/radar'
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
            <NavLink to="/admin/opportunities" className={navLinkClass}>
              Opportunities
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
  const [invitePlan, setInvitePlan] = useState<'free' | 'paid'>('free')
  const [formError, setFormError] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<{
    email: string
    emailSent: boolean
    emailError: string | null
    setupUrl: string | null
  } | null>(null)
  const [coverageUser, setCoverageUser] = useState<AdminUserRow | null>(null)
  const [radarHistoryUser, setRadarHistoryUser] = useState<AdminUserRow | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => listAdminUsers(token!),
    enabled: Boolean(token),
    refetchInterval: 15_000,
  })

  const create = useMutation({
    mutationFn: () =>
      createAdminUser(token!, {
        name: name.trim(),
        email: email.trim(),
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
        plan: invitePlan,
      }),
    onSuccess: (row) => {
      setFormError(null)
      setInviteResult({
        email: row.email,
        emailSent: Boolean(row.email_sent),
        emailError: row.email_error ?? null,
        setupUrl: row.setup_url ?? null,
      })
      setName('')
      setEmail('')
      setCompany('')
      setPhone('')
      setInvitePlan('free')
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

  const setPlan = useMutation({
    mutationFn: ({ userId, plan }: { userId: number | string; plan: 'free' | 'paid' }) =>
      setAdminUserPlan(token!, userId, plan),
    onSuccess: () => {
      setActionError(null)
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Could not update plan.')
    },
  })

  const removeUser = useMutation({
    mutationFn: (userId: number | string) => removeAdminUser(token!, userId),
    onSuccess: () => {
      setActionError(null)
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Could not remove user.')
    },
  })

  const restoreUser = useMutation({
    mutationFn: (userId: number | string) => restoreAdminUser(token!, userId),
    onSuccess: () => {
      setActionError(null)
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'Could not restore user.')
    },
  })

  const provisioning = (users.data || []).filter((row) => row.status === 'provisioning')
  const activeUsers = (users.data || []).filter((row) => row.status !== 'provisioning')

  return (
    <div>
      <h1 className="text-[1.5rem] font-semibold tracking-[-0.025em] text-ink">Users</h1>
      <p className="mt-2 max-w-2xl text-[0.9375rem] text-graphite">
        Invite customers on free or paid. Switch plan in place (same login). Remove ends access
        immediately; their data is purged after 2 days unless you restore them.
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
          <label className="block text-sm sm:col-span-2 sm:max-w-xs">
            <span className="mb-1 block text-ink-secondary">Plan</span>
            <select
              value={invitePlan}
              onChange={(e) => setInvitePlan(e.target.value as 'free' | 'paid')}
              className="h-9 w-full rounded-md border border-mist bg-paper px-3 text-ink"
            >
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
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
                Invite sent to {inviteResult.email}. After they set a password, finish setup in
                Waiting for workspace below.
              </p>
            ) : (
              <>
                <p className="font-medium">
                  User created for {inviteResult.email}, but email could not be sent.
                </p>
                {inviteResult.emailError ? (
                  <p className="mt-1 text-xs text-graphite">{inviteResult.emailError}</p>
                ) : null}
                {inviteResult.setupUrl ? (
                  <p className="mt-2 break-all font-mono text-[12px] text-graphite">
                    Share this link: {inviteResult.setupUrl}
                  </p>
                ) : (
                  <p className="mt-2 text-graphite">
                    Check Resend / EMAIL_FROM settings, then resend the setup email.
                  </p>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>

      {provisioning.length && token ? (
        <div className="mt-8 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-ink">Waiting for workspace setup</h2>
            <p className="mt-1 text-sm text-graphite">
              One card per new user: API key, NAICS coverage, then Activate. They unlock immediately.
            </p>
          </div>
          {provisioning.map((row) => (
            <ProvisioningSetupCard
              key={String(row.id)}
              token={token}
              user={row}
              onActivated={() => void qc.invalidateQueries({ queryKey: ['admin', 'users'] })}
            />
          ))}
        </div>
      ) : null}

      {actionError ? (
        <p className="mt-6 text-sm text-danger">{actionError}</p>
      ) : null}

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
          <table className="w-full min-w-[52rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-paper">
                <th className="px-4 py-3 font-medium text-ink-secondary">Name</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Email</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Plan</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Status</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Source key</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Joined</th>
                <th className="px-4 py-3 font-medium text-ink-secondary">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {activeUsers.map((row) => {
                const isRemoved = row.status === 'removed'
                const planValue = (row.plan === 'paid' ? 'paid' : 'free') as 'free' | 'paid'
                return (
                  <tr key={String(row.id)} className="align-top">
                    <td className="px-4 py-3 font-medium text-ink">
                      {row.name}
                      {row.is_demo ? (
                        <span className="ml-2 text-xs font-normal text-forest">demo</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-graphite">{row.email}</td>
                    <td className="px-4 py-3">
                      {isRemoved || row.is_demo ? (
                        <span className="text-graphite">{planValue}</span>
                      ) : (
                        <select
                          value={planValue}
                          disabled={setPlan.isPending}
                          onChange={(e) =>
                            setPlan.mutate({
                              userId: row.id,
                              plan: e.target.value as 'free' | 'paid',
                            })
                          }
                          className="h-8 rounded-md border border-mist bg-paper px-2 text-ink"
                        >
                          <option value="free">free</option>
                          <option value="paid">paid</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-graphite">
                      <div>{row.status}</div>
                      {isRemoved && row.purge_at ? (
                        <div className="mt-1 text-xs text-danger">
                          Purge {new Date(row.purge_at).toLocaleString()}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-graphite">
                      {row.has_gov_api_key ? 'Attached' : '—'}
                    </td>
                    <td className="px-4 py-3 text-graphite">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!isRemoved && (row.status === 'active' || row.status === 'paid') ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setRadarHistoryUser(null)
                              setCoverageUser(row)
                            }}
                          >
                            Edit NAICS
                          </Button>
                        ) : null}
                        {!isRemoved ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setCoverageUser(null)
                              setRadarHistoryUser(row)
                            }}
                          >
                            Radar runs
                          </Button>
                        ) : null}
                        {isRemoved ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={restoreUser.isPending}
                            onClick={() => restoreUser.mutate(row.id)}
                          >
                            Restore
                          </Button>
                        ) : row.is_demo ? null : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            loading={removeUser.isPending}
                            onClick={() => {
                              const ok = window.confirm(
                                `Remove ${row.email}? They lose access now. Data is purged after 2 days unless you restore them.`,
                              )
                              if (ok) removeUser.mutate(row.id)
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {coverageUser && token ? (
        <UserNaicsPanel
          token={token}
          user={coverageUser}
          onClose={() => setCoverageUser(null)}
        />
      ) : null}

      {radarHistoryUser && token ? (
        <AdminRadarHistoryPanel
          token={token}
          user={radarHistoryUser}
          onClose={() => setRadarHistoryUser(null)}
        />
      ) : null}
    </div>
  )
}

const DEFAULT_EMPLOYMENT = ['561311', '561312', '561320', '561330']

function formatAdminRunWhen(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function AdminRadarHistoryPanel({
  token,
  user,
  onClose,
}: {
  token: string
  user: AdminUserRow
  onClose: () => void
}) {
  const [openId, setOpenId] = useState<string | number | null>(null)
  const history = useQuery({
    queryKey: ['admin', 'users', user.id, 'radar-runs'],
    queryFn: () => getAdminUserRadarRuns(token, user.id),
  })

  const runs = history.data?.runs ?? []

  return (
    <div className="mt-8 rounded-md border border-mist bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Radar run history</h2>
          <p className="mt-1 text-sm text-graphite">
            {user.name} · {user.email}. Use this when a customer asks when they scanned.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {history.isLoading ? (
        <p className="mt-4 text-sm text-graphite">Loading runs…</p>
      ) : history.isError ? (
        <p className="mt-4 text-sm text-danger">Could not load Radar history.</p>
      ) : !runs.length ? (
        <p className="mt-4 text-sm text-graphite">No Radar runs recorded for this user yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-mist">
          {runs.map((run) => {
            const expanded = openId === run.id
            return (
              <li key={String(run.id)} className="py-3">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setOpenId(expanded ? null : run.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      Run #{run.runNumber} · {formatAdminRunWhen(run.createdAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-graphite">
                      {run.status} · {run.jobsFound} found · {run.newCount} new
                    </p>
                  </div>
                  <span className="text-xs font-medium text-forest">
                    {expanded ? 'Hide' : 'Details'}
                  </span>
                </button>
                {expanded ? (
                  run.newItems?.length ? (
                    <ul className="mt-2 space-y-1 rounded-md border border-mist bg-paper px-3 py-2 text-sm">
                      {run.newItems.map((item, index) => (
                        <li key={`${item.externalJobId || index}`}>
                          {item.title || 'Untitled'}
                          {item.boardName ? ` · ${item.boardName}` : ''}
                          {item.naics ? ` · NAICS ${item.naics}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-graphite">No new items on this run.</p>
                  )
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ProvisioningSetupCard({
  token,
  user,
  onActivated,
}: {
  token: string
  user: AdminUserRow
  onActivated: () => void
}) {
  const [apiKey, setApiKey] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_EMPLOYMENT))
  const [showCodes, setShowCodes] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catalog = useQuery({
    queryKey: ['admin', 'naics', 'catalog'],
    queryFn: () => listNaicsCatalog(token),
  })

  const coverage = useQuery({
    queryKey: ['admin', 'users', user.id, 'naics'],
    queryFn: () => getUserNaicsCoverage(token, user.id),
  })

  useEffect(() => {
    if (coverage.data?.codes?.length) {
      setSelected(new Set(coverage.data.codes))
    }
  }, [coverage.data])

  const activate = useMutation({
    mutationFn: () =>
      activateAdminUser(token, user.id, {
        gov_api_key: apiKey.trim() || undefined,
        naics_codes: Array.from(selected),
      }),
    onSuccess: () => {
      setError(null)
      onActivated()
    },
    onError: (err: unknown) => {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not activate user.',
      )
    },
  })

  function toggleCode(code: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const sector56 = catalog.data?.sectors.find((s) => s.sector_code === '56')

  return (
    <div className="rounded-md border border-mist bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{user.name}</p>
          <p className="text-sm text-graphite">
            {user.email}
            {user.company ? ` · ${user.company}` : ''}
            {user.plan ? ` · ${user.plan}` : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={activate.isPending}
          onClick={() => activate.mutate()}
        >
          Activate workspace
        </Button>
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-ink-secondary">
          Government source API key (optional if shared key is already configured)
        </span>
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="h-9 w-full max-w-xl rounded-md border border-mist bg-paper px-3 font-mono text-ink"
          placeholder="Paste key for this workspace"
        />
      </label>

      <div className="mt-4">
        <p className="text-sm font-medium text-ink">NAICS coverage</p>
        <p className="mt-1 text-xs text-graphite">
          Defaults to employment (4 codes). Expand later with Edit NAICS after activate if sales
          needs more.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSelected(new Set(DEFAULT_EMPLOYMENT))}
          >
            Default 4 codes
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const codes =
                sector56?.groups.find((g) => g.group_code === '5613')?.codes.map((c) => c.code) ||
                DEFAULT_EMPLOYMENT
              setSelected(new Set(codes))
            }}
          >
            Employment (5613)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const codes = sector56?.groups.flatMap((g) => g.codes.map((c) => c.code)) || []
              setSelected(new Set(codes))
            }}
          >
            Full Sector 56
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setShowCodes((v) => !v)}>
            {showCodes ? 'Hide codes' : `Customize (${selected.size})`}
          </Button>
        </div>
      </div>

      {showCodes ? (
        catalog.isLoading ? (
          <p className="mt-3 text-sm text-graphite">Loading catalog…</p>
        ) : (
          <div className="mt-3 max-h-64 space-y-3 overflow-y-auto rounded-md border border-mist bg-paper p-3">
            {(sector56?.groups || []).map((group) => (
              <div key={group.group_code}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-secondary">
                  {group.group_code} · {group.group_title}
                </p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {group.codes.map((code) => (
                    <li key={code.code}>
                      <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-0.5 text-sm hover:bg-white">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.has(code.code)}
                          onChange={() => toggleCode(code.code)}
                        />
                        <span>
                          <span className="font-mono text-ink">{code.code}</span>
                          <span className="block text-xs text-graphite">{code.title}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      ) : (
        <p className="mt-2 text-xs text-ink-secondary">
          Selected: {Array.from(selected).sort().join(', ') || 'none'}
        </p>
      )}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
    </div>
  )
}

function UserNaicsPanel({
  token,
  user,
  onClose,
}: {
  token: string
  user: AdminUserRow
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedSector, setExpandedSector] = useState<string | null>('56')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const catalog = useQuery({
    queryKey: ['admin', 'naics', 'catalog'],
    queryFn: () => listNaicsCatalog(token),
  })

  const coverage = useQuery({
    queryKey: ['admin', 'users', user.id, 'naics'],
    queryFn: () => getUserNaicsCoverage(token, user.id),
  })

  useEffect(() => {
    if (coverage.data) {
      setSelected(new Set(coverage.data.codes))
    }
  }, [coverage.data])

  const save = useMutation({
    mutationFn: (body: { codes?: string[]; sector_code?: string; group_code?: string }) =>
      setUserNaicsCoverage(token, user.id, body),
    onSuccess: (row) => {
      setSelected(new Set(row.codes))
      setMessage(`Saved ${row.count} NAICS code(s) for ${user.email}.`)
      setError(null)
      void coverage.refetch()
    },
    onError: (err: unknown) => {
      setMessage(null)
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save coverage.',
      )
    },
  })

  function toggleCode(code: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  function selectGroup(codes: string[]) {
    setSelected((prev) => {
      const next = new Set(prev)
      codes.forEach((c) => next.add(c))
      return next
    })
  }

  return (
    <div className="mt-8 rounded-md border border-mist bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Edit NAICS coverage</h2>
          <p className="mt-1 text-sm text-graphite">
            {user.name} · {user.email}. Use after sales expands requirements.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={save.isPending}
          onClick={() => save.mutate({ sector_code: '56' })}
        >
          Full Sector 56
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={save.isPending}
          onClick={() => save.mutate({ group_code: '5613' })}
        >
          Employment (5613)
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={save.isPending}
          onClick={() => save.mutate({ codes: DEFAULT_EMPLOYMENT })}
        >
          Default 4 codes
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          loading={save.isPending}
          onClick={() => save.mutate({ codes: Array.from(selected) })}
        >
          Save selection ({selected.size})
        </Button>
      </div>

      {message ? <p className="mt-3 text-sm text-forest">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {catalog.isLoading || coverage.isLoading ? (
        <p className="mt-4 text-sm text-graphite">Loading catalog…</p>
      ) : catalog.isError ? (
        <p className="mt-4 text-sm text-danger">Could not load NAICS catalog.</p>
      ) : (
        <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
          {(catalog.data?.sectors || []).map((sector) => (
            <div key={sector.sector_code} className="rounded-md border border-mist bg-paper">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() =>
                  setExpandedSector((cur) =>
                    cur === sector.sector_code ? null : sector.sector_code,
                  )
                }
              >
                <span className="text-sm font-medium text-ink">
                  Sector {sector.sector_code} · {sector.sector_title}
                </span>
                <span className="text-xs text-ink-secondary">{sector.code_count} codes</span>
              </button>
              {expandedSector === sector.sector_code ? (
                <div className="space-y-4 border-t border-mist px-4 py-3">
                  {sector.groups.map((group) => (
                    <div key={group.group_code}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
                          {group.group_code} · {group.group_title}
                        </p>
                        <button
                          type="button"
                          className="text-xs font-medium text-forest underline"
                          onClick={() => selectGroup(group.codes.map((c) => c.code))}
                        >
                          Select group
                        </button>
                      </div>
                      <ul className="grid gap-1 sm:grid-cols-2">
                        {group.codes.map((code) => (
                          <li key={code.code}>
                            <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 text-sm hover:bg-white">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={selected.has(code.code)}
                                onChange={() => toggleCode(code.code)}
                              />
                              <span>
                                <span className="font-mono text-ink">{code.code}</span>
                                <span className="block text-xs text-graphite">{code.title}</span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
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

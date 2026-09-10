import * as Switch from '@radix-ui/react-switch'
import { Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { UserAvatar } from '@/app/components/common/Avatar'
import { Button } from '@/app/components/common/Button'
import { Field, Select, TextInput } from '@/app/components/forms/Field'
import { PageHeader } from '@/app/components/layout/PageHeader'
import { Panel, PanelHeader } from '@/app/components/layout/Panel'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'
import { cn } from '@/shared/cn'
import { CUSTOMER_HOME, markCustomerSignedOut } from '@/app/utils/authRedirect'

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'team', label: 'Team' },
  { id: 'email', label: 'Email Preferences' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

function ToggleRow({
  label,
  description,
  defaultChecked,
}: {
  label: string
  description: string
  defaultChecked?: boolean
}) {
  const [checked, setChecked] = useState(defaultChecked ?? false)
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{description}</p>
      </div>
      <Switch.Root
        checked={checked}
        onCheckedChange={setChecked}
        aria-label={label}
        className="relative mt-0.5 h-5 w-9 shrink-0 cursor-pointer rounded-full border border-line-strong bg-surface-sunken transition-colors data-[state=checked]:border-signal-600 data-[state=checked]:bg-signal-600"
      >
        <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-raise transition-transform duration-150 will-change-transform data-[state=checked]:translate-x-[18px]" />
      </Switch.Root>
    </div>
  )
}

export function SettingsPage() {
  const { user, team } = useCurrentUser()
  const navigate = useNavigate()
  const clearUserSession = useAuthStore((s) => s.clearUserSession)
  const [searchParams, setSearchParams] = useSearchParams()
  const section = (searchParams.get('section') as SectionId | null) ?? 'profile'

  function signOut() {
    markCustomerSignedOut()
    navigate('/login', { replace: true, state: { from: CUSTOMER_HOME } })
    clearUserSession()
    toast.info('Signed out')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile, workspace and preferences."
        actions={
          <Button type="button" variant="secondary" size="sm" onClick={signOut}>
            Sign out
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <ul className="scrollbar-thin flex gap-1 overflow-x-auto lg:block lg:space-y-0.5 lg:overflow-visible">
            {SECTIONS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSearchParams({ section: item.id }, { replace: true })}
                  aria-current={section === item.id ? 'page' : undefined}
                  className={cn(
                    'relative h-9 w-full shrink-0 rounded-md px-2.5 text-left text-[13.5px] font-medium whitespace-nowrap transition-colors',
                    section === item.id
                      ? 'bg-forest-50 text-forest-900'
                      : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
                  )}
                >
                  {section === item.id && (
                    <span
                      aria-hidden
                      className="absolute top-1.5 bottom-1.5 -left-2 w-[3px] rounded-r-full bg-signal-600 max-sm:hidden"
                    />
                  )}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-4">
          {section === 'profile' && (
            <Panel>
              <div className="flex items-center gap-3 border-b border-line pb-4">
                <UserAvatar name={user.name} tone={user.avatarTone} size="xl" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{user.name}</p>
                  <p className="truncate text-[13px] text-ink-muted">
                    {user.jobTitle} · {user.company}
                  </p>
                </div>
              </div>

              <form
                className="mt-4 grid gap-4 sm:grid-cols-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  toast.success('Profile saved.')
                }}
              >
                <Field label="Full name" htmlFor="profile-name">
                  <TextInput id="profile-name" defaultValue={user.name} />
                </Field>
                <Field label="Job title" htmlFor="profile-title">
                  <TextInput id="profile-title" defaultValue={user.jobTitle} />
                </Field>
                <Field
                  label="Work email"
                  htmlFor="profile-email"
                  hint="Managed by your identity provider."
                >
                  <TextInput id="profile-email" defaultValue={user.email} readOnly />
                </Field>
                <Field label="Phone" htmlFor="profile-phone">
                  <TextInput id="profile-phone" defaultValue={user.phone ?? ''} />
                </Field>
                <div className="sm:col-span-2">
                  <Button type="submit" variant="primary">
                    Save changes
                  </Button>
                </div>
              </form>
            </Panel>
          )}

          {section === 'workspace' && (
            <Panel>
              <h2 className="text-[15px] font-semibold text-ink">Workspace</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Workspace name" htmlFor="workspace-name">
                  <TextInput id="workspace-name" defaultValue={user.company} />
                </Field>
                <Field label="Default temperature view" htmlFor="workspace-temp">
                  <Select id="workspace-temp" defaultValue="hot_plus">
                    <option value="hot_plus">Very Hot and Hot</option>
                    <option value="very_hot">Very Hot only</option>
                  </Select>
                </Field>
                <Field
                  label="Duplicate outreach window"
                  htmlFor="workspace-window"
                  hint="How long a company stays flagged as recently contacted."
                >
                  <Select id="workspace-window" defaultValue="14">
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </Select>
                </Field>
              </div>
              <Button className="mt-4" variant="primary" onClick={() => toast.success('Workspace settings saved.')}>
                Save changes
              </Button>
            </Panel>
          )}

          {section === 'team' && (
            <Panel flush>
              <PanelHeader
                title="Team"
                description="People with access to this workspace"
                action={<Button size="sm" variant="secondary">Invite member</Button>}
              />
              <ul className="divide-y divide-line">
                {team.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar name={member.name} tone={member.avatarTone} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">
                        {member.id === user.id ? `${member.name} (you)` : member.name}
                      </p>
                      <p className="truncate text-[12.5px] text-ink-muted">{member.email}</p>
                    </div>
                    <span className="shrink-0 text-[13px] text-ink-secondary">
                      {member.jobTitle}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {section === 'email' && (
            <>
              <Panel>
                <h2 className="text-[15px] font-semibold text-ink">Connected email</h2>
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface-muted px-4 py-3">
                  <Mail className="size-4 shrink-0 text-ink-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">{user.email}</p>
                    <p className="text-[12.5px] text-ink-muted">Status: Not connected</p>
                  </div>
                  <Button variant="secondary" size="sm" disabled>
                    Connect
                  </Button>
                </div>
                <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-muted">
                  <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden />
                  <span>
                    Email delivery is handled by the backend using your authenticated account.
                    Opportunity Pedia never stores mailbox credentials in the browser.
                  </span>
                </p>
              </Panel>

              <Panel>
                <h2 className="text-[15px] font-semibold text-ink">Outreach defaults</h2>
                <div className="mt-2 divide-y divide-line">
                  <ToggleRow
                    label="Warn before duplicate outreach"
                    description="Show who last contacted a company before you compose a new message."
                    defaultChecked
                  />
                  <ToggleRow
                    label="Copy me on outreach"
                    description="Send a copy of every outreach email to your inbox."
                  />
                  <ToggleRow
                    label="Automatically flag follow-ups"
                    description="Mark an opportunity for follow-up if there is no reply within 7 days."
                    defaultChecked
                  />
                </div>
              </Panel>
            </>
          )}

          {section === 'notifications' && (
            <Panel>
              <h2 className="text-[15px] font-semibold text-ink">Notifications</h2>
              <div className="mt-2 divide-y divide-line">
                <ToggleRow
                  label="New Very Hot opportunities"
                  description="Notify me when a Very Hot opportunity is discovered."
                  defaultChecked
                />
                <ToggleRow
                  label="Assignments"
                  description="Notify me when an opportunity is assigned to me."
                  defaultChecked
                />
                <ToggleRow
                  label="Deadlines"
                  description="Remind me when a deadline on my assignments is within 3 days."
                  defaultChecked
                />
                <ToggleRow
                  label="Team outreach"
                  description="Notify me when a teammate contacts an opportunity I follow."
                />
              </div>
            </Panel>
          )}

          {section === 'appearance' && (
            <Panel>
              <h2 className="text-[15px] font-semibold text-ink">Appearance</h2>
              <p className="mt-1 text-[13px] text-ink-muted">
                Opportunity Pedia uses a light enterprise theme. A dark theme is planned.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border-2 border-signal-600 p-3">
                  <div className="h-16 rounded border border-line bg-canvas" />
                  <p className="mt-2 text-[13px] font-medium text-ink">Light</p>
                  <p className="text-[12px] text-ink-muted">Current theme</p>
                </div>
                <div className="rounded-lg border border-line p-3 opacity-60">
                  <div className="h-16 rounded border border-forest-800 bg-forest-900" />
                  <p className="mt-2 text-[13px] font-medium text-ink">Dark</p>
                  <p className="text-[12px] text-ink-muted">Coming soon</p>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}

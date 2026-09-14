import { useNavigate, useSearchParams } from 'react-router-dom'

import { Button } from '@/app/components/common/Button'
import { PageHeader } from '@/app/components/layout/PageHeader'
import { ProfileSettingsPanel } from '@/app/features/settings/ProfileSettingsPanel'
import { TeamSettingsPanel } from '@/app/features/settings/TeamSettingsPanel'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'
import { cn } from '@/shared/cn'
import { CUSTOMER_HOME, markCustomerSignedOut } from '@/app/utils/authRedirect'

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'team', label: 'Team' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

function isSectionId(value: string | null): value is SectionId {
  return value === 'profile' || value === 'team'
}

export function SettingsPage() {
  const navigate = useNavigate()
  const clearUserSession = useAuthStore((s) => s.clearUserSession)
  const [searchParams, setSearchParams] = useSearchParams()
  const rawSection = searchParams.get('section')
  const section: SectionId = isSectionId(rawSection) ? rawSection : 'profile'

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
        subtitle="Your profile and workspace team."
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
          {section === 'profile' && <ProfileSettingsPanel />}
          {section === 'team' && <TeamSettingsPanel />}
        </div>
      </div>
    </div>
  )
}

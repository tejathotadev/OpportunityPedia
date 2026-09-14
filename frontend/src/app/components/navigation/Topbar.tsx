import { LifeBuoy, Menu, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { UserAvatar } from '@/app/components/common/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/common/DropdownMenu'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'
import { useUiStore } from '@/app/store/useUiStore'
import { CUSTOMER_HOME, markCustomerSignedOut } from '@/app/utils/authRedirect'

import { NotificationPanel } from './NotificationPanel'

/** Detects Apple platforms so the shortcut hint matches the user's keyboard. */
function shortcutLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl K'
  return /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'
}

export function Topbar() {
  const setSearchOpen = useUiStore((state) => state.setSearchOpen)
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen)
  const openSupport = useUiStore((state) => state.openSupport)
  const clearUserSession = useAuthStore((state) => state.clearUserSession)
  const { user } = useCurrentUser()
  const navigate = useNavigate()

  function signOut() {
    markCustomerSignedOut()
    navigate('/login', { replace: true, state: { from: CUSTOMER_HOME } })
    clearUserSession()
    toast.info('Signed out')
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:px-4">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setMobileNavOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-surface-sunken hover:text-ink lg:hidden"
      >
        <Menu className="size-[18px]" aria-hidden />
      </button>

      {/* min-w-0 lets the field shrink on narrow screens; without it the flex
          item keeps its intrinsic width and pushes the account menu off. */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="group flex h-9 max-w-md min-w-0 flex-1 items-center gap-2 rounded-md border border-line-strong bg-surface-muted px-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-sunken"
      >
        <Search className="size-4 shrink-0 text-ink-subtle" aria-hidden />
        <span className="flex-1 truncate text-[13px] text-ink-subtle">
          Search companies, opportunities, vendors...
        </span>
        <kbd className="hidden shrink-0 items-center rounded border border-line-strong bg-surface px-1.5 py-0.5 font-sans text-[11px] text-ink-muted sm:inline-flex">
          {shortcutLabel()}
        </kbd>
      </button>

      {/* Utility only — the primary action for a screen lives in its PageHeader. */}
      <div className="ml-auto flex items-center gap-1">
        <NotificationPanel />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className="ml-0.5 inline-flex items-center rounded-full p-0.5 transition-colors hover:bg-surface-sunken"
            >
              <UserAvatar name={user.name} tone={user.avatarTone} size="md" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60">
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="px-2 pb-2">
              <p className="text-[13px] font-medium text-ink">{user.name}</p>
              <p className="text-[12px] text-ink-muted">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate('/app/settings')}>
              Profile settings
            </DropdownMenuItem>
            <DropdownMenuItem icon={<LifeBuoy />} onSelect={() => openSupport()}>
              Help &amp; Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={signOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

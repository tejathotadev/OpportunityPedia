import { History, LifeBuoy, LogOut, UserRound } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { UserAvatar } from '@/app/components/common/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/common/DropdownMenu'
import { Tooltip } from '@/app/components/common/Tooltip'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import { useAuthStore } from '@/app/store/useAuthStore'
import { toast } from '@/app/store/useToastStore'
import { useUiStore } from '@/app/store/useUiStore'
import { Logo } from '@/shared/brand/Logo'
// App shell shows the product lockup (OpportunityPedia by OpportunityX).
import { cn } from '@/shared/cn'
import { CUSTOMER_HOME, markCustomerSignedOut } from '@/app/utils/authRedirect'

import { primaryNav, secondaryNav, type NavItem } from './navItems'

interface SidebarProps {
  collapsed: boolean
  /** Mobile drawer renders the same nav without the collapse control. */
  variant?: 'desktop' | 'mobile'
  onNavigate?: () => void
}

function NavRow({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()
  const active = item.matchPrefix
    ? location.pathname.startsWith(item.to)
    : location.pathname === item.to

  const Icon = item.icon

  return (
    <Tooltip content={item.label} side="right" enabled={collapsed}>
      <NavLink
        to={item.to}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative flex items-center gap-2.5 rounded-md text-[13.5px] font-medium transition-colors duration-150',
          collapsed ? 'h-9 w-9 justify-center' : 'h-9 px-2.5',
          active
            ? 'bg-forest-50 text-forest-900'
            : 'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
        )}
      >
        {active && (
          <span
            aria-hidden
            className="absolute top-1.5 bottom-1.5 -left-2 w-[3px] rounded-r-full bg-signal-600"
          />
        )}
        <Icon
          className={cn('size-[17px] shrink-0', active ? 'text-forest-800' : 'text-ink-muted')}
          aria-hidden
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    </Tooltip>
  )
}

export function Sidebar({ collapsed, variant = 'desktop', onNavigate }: SidebarProps) {
  const openRadarRunsDrawer = useUiStore((state) => state.openRadarRuns)
  const openSupport = useUiStore((state) => state.openSupport)
  const clearUserSession = useAuthStore((state) => state.clearUserSession)
  const { user } = useCurrentUser()
  const navigate = useNavigate()
  const isCollapsed = variant === 'mobile' ? false : collapsed

  function signOut() {
    onNavigate?.()
    markCustomerSignedOut()
    navigate('/login', { replace: true, state: { from: CUSTOMER_HOME } })
    clearUserSession()
    toast.info('Signed out')
  }

  function openRadarRuns() {
    onNavigate?.()
    openRadarRunsDrawer()
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Matches the Topbar height so both bottom borders form one rule. */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-line',
          isCollapsed ? 'justify-center px-2' : 'px-4',
        )}
      >
        <NavLink
          to="/app/overview"
          onClick={onNavigate}
          aria-label="OpportunityPedia — Overview"
          className="inline-flex rounded-sm"
        >
          <Logo asLink={false} entity="product" variant={isCollapsed ? 'mark' : 'full'} />
        </NavLink>
      </div>

      <nav
        aria-label="Main"
        className={cn('scrollbar-thin flex-1 overflow-y-auto py-3', isCollapsed ? 'px-3' : 'px-4')}
      >
        <ul className="space-y-0.5">
          {primaryNav.map((item) => (
            <li key={item.to}>
              <NavRow item={item} collapsed={isCollapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>

        <div className={cn('my-3 h-px bg-line', isCollapsed && 'mx-1')} />

        {!isCollapsed && (
          <p className="mb-1.5 px-2.5 text-[11px] font-semibold tracking-[0.06em] text-ink-subtle uppercase">
            Workspace
          </p>
        )}
        <ul className="space-y-0.5">
          {secondaryNav.map((item) => (
            <li key={item.to}>
              <NavRow item={item} collapsed={isCollapsed} onNavigate={onNavigate} />
            </li>
          ))}
          <li>
            <Tooltip content="Radar runs" side="right" enabled={isCollapsed}>
              <button
                type="button"
                onClick={openRadarRuns}
                className={cn(
                  'group relative flex w-full cursor-pointer items-center gap-2.5 rounded-md text-[13.5px] font-medium transition-colors duration-150',
                  isCollapsed ? 'h-9 w-9 justify-center' : 'h-9 px-2.5',
                  'text-ink-secondary hover:bg-surface-sunken hover:text-ink',
                )}
              >
                <History className="size-[17px] shrink-0 text-ink-muted" aria-hidden />
                {!isCollapsed && <span className="truncate">Radar runs</span>}
              </button>
            </Tooltip>
          </li>
        </ul>
      </nav>

      <div className={cn('shrink-0 border-t border-line py-3', isCollapsed ? 'px-3' : 'px-4')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md py-1.5 text-left transition-colors hover:bg-surface-sunken',
                isCollapsed ? 'justify-center px-0' : 'px-2',
              )}
              aria-label="Account menu"
            >
              <UserAvatar name={user.name} tone={user.avatarTone} size="md" />
              {!isCollapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">
                    {user.name}
                  </span>
                  <span className="block truncate text-[12px] text-ink-muted">{user.jobTitle}</span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              icon={<UserRound />}
              onSelect={() => {
                onNavigate?.()
                navigate('/app/settings')
              }}
            >
              Profile settings
            </DropdownMenuItem>
            <DropdownMenuItem
              icon={<LifeBuoy />}
              onSelect={() => {
                onNavigate?.()
                openSupport()
              }}
            >
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<LogOut />} destructive onSelect={signOut}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

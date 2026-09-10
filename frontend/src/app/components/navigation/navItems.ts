import {
  Activity,
  Building2,
  LayoutDashboard,
  Radar,
  Settings,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Matches nested routes such as /opportunities/:id. */
  matchPrefix?: boolean
}

export const primaryNav: NavItem[] = [
  { to: '/app/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/app/opportunities', label: 'Opportunities', icon: Radar, matchPrefix: true },
  { to: '/app/vendors', label: 'Vendors', icon: Building2, matchPrefix: true },
  { to: '/app/my-assignments', label: 'My Assignments', icon: UserCheck },
  { to: '/app/activity', label: 'Team Activity', icon: Activity },
]

export const secondaryNav: NavItem[] = [
  { to: '/app/settings', label: 'Settings', icon: Settings, matchPrefix: true },
]

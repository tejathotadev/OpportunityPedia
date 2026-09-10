import { lazy } from 'react'

/**
 * Route-level code splitting. Every product screen is split, including
 * Overview and the product 404 — inside the merged site these would
 * otherwise be pulled into the marketing entry chunk.
 */
export const OverviewPage = lazy(() =>
  import('./OverviewPage').then((m) => ({ default: m.OverviewPage })),
)
export const OpportunitiesPage = lazy(() =>
  import('./OpportunitiesPage').then((m) => ({ default: m.OpportunitiesPage })),
)
export const VendorsPage = lazy(() =>
  import('./VendorsPage').then((m) => ({ default: m.VendorsPage })),
)
export const VendorProfilePage = lazy(() =>
  import('./VendorProfilePage').then((m) => ({ default: m.VendorProfilePage })),
)
export const MyAssignmentsPage = lazy(() =>
  import('./MyAssignmentsPage').then((m) => ({ default: m.MyAssignmentsPage })),
)
export const TeamActivityPage = lazy(() =>
  import('./TeamActivityPage').then((m) => ({ default: m.TeamActivityPage })),
)
export const SettingsPage = lazy(() =>
  import('./SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
export const NotFoundPage = lazy(() =>
  import('./NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)
export const OpportunityRouteDrawer = lazy(() =>
  import('@/app/features/opportunities/OpportunityRouteDrawer').then((m) => ({
    default: m.OpportunityRouteDrawer,
  })),
)

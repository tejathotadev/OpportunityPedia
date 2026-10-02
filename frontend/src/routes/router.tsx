import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, createBrowserRouter } from 'react-router-dom'

import {
  MyAssignmentsPage,
  NotFoundPage as AppNotFoundPage,
  OpportunitiesPage,
  OpportunityRouteDrawer,
  OverviewPage,
  SettingsPage,
  TeamActivityPage,
  VendorsPage,
} from '@/app/pages/lazy'
import { SiteLayout } from '@/marketing/components/layout/SiteLayout'
import { HomePage } from '@/marketing/pages/Home/HomePage'
import {
  CareersPage,
  CompanyPage,
  ContactPage,
  NotFoundPage as MarketingNotFoundPage,
  OpportunityPediaPage,
  PrivacyPage,
  ProductsPage,
  TermsPage,
} from '@/marketing/pages/lazy'

import { RouteFallback } from './RouteFallback'

/**
 * One router for marketing (`/`), product (`/app/*`), customer sign-in
 * (`/login`), and the hidden admin console (`/admin/*`).
 */

const AppProviders = lazy(() => import('@/app/AppProviders'))
const LoginPage = lazy(() => import('@/app/pages/LoginPage'))
const SetPasswordPage = lazy(() => import('@/app/pages/SetPasswordPage'))
const WorkspaceSetupPage = lazy(() => import('@/app/pages/WorkspaceSetupPage'))
const FreeSignupPage = lazy(() => import('@/app/pages/FreeSignupPage'))
const AdminLoginPage = lazy(() => import('@/app/pages/admin/AdminLoginPage'))
const AdminApp = lazy(() => import('@/app/pages/admin/AdminApp'))
const AdminUsersPage = lazy(() =>
  import('@/app/pages/admin/AdminApp').then((m) => ({ default: m.AdminUsersPage })),
)
const AdminLeadsPage = lazy(() =>
  import('@/app/pages/admin/AdminApp').then((m) => ({ default: m.AdminLeadsPage })),
)
const AdminOpportunitiesPage = lazy(() =>
  import('@/app/pages/admin/AdminOpportunitiesPage').then((m) => ({
    default: m.AdminOpportunitiesPage,
  })),
)

const split = (node: ReactNode) => <Suspense fallback={<RouteFallback />}>{node}</Suspense>

export const router = createBrowserRouter([
  {
    path: '/login',
    element: split(<LoginPage />),
  },
  {
    path: '/set-password',
    element: split(<SetPasswordPage />),
  },
  {
    path: '/workspace-setup',
    element: split(<WorkspaceSetupPage />),
  },
  {
    path: '/get-started',
    element: split(<FreeSignupPage />),
  },
  {
    path: '/admin/login',
    element: split(<AdminLoginPage />),
  },
  {
    path: '/admin',
    element: split(<AdminApp />),
    children: [
      { index: true, element: <Navigate to="/admin/leads" replace /> },
      { path: 'leads', element: split(<AdminLeadsPage />) },
      { path: 'opportunities', element: split(<AdminOpportunitiesPage />) },
      { path: 'users', element: split(<AdminUsersPage />) },
      { path: '*', element: <Navigate to="/admin/leads" replace /> },
    ],
  },
  {
    path: '/app',
    element: split(<AppProviders />),
    children: [
      { index: true, element: <Navigate to="/app/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      {
        path: 'opportunities',
        element: <OpportunitiesPage />,
        children: [{ path: ':id', element: <OpportunityRouteDrawer /> }],
      },
      {
        path: 'vendors',
        element: <VendorsPage />,
        children: [{ path: ':id', element: <OpportunityRouteDrawer /> }],
      },
      { path: 'my-assignments', element: <MyAssignmentsPage /> },
      { path: 'activity', element: <TeamActivityPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <AppNotFoundPage /> },
    ],
  },
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: split(<ProductsPage />) },
      { path: 'products/opportunitypedia', element: split(<OpportunityPediaPage />) },
      { path: 'products/opportunityx', element: <Navigate to="/products/opportunitypedia" replace /> },
      { path: 'company', element: split(<CompanyPage />) },
      { path: 'careers', element: split(<CareersPage />) },
      { path: 'contact', element: split(<ContactPage />) },
      { path: 'privacy', element: split(<PrivacyPage />) },
      { path: 'terms', element: split(<TermsPage />) },
      { path: 'about', element: <Navigate to="/company" replace /> },
      { path: '*', element: split(<MarketingNotFoundPage />) },
    ],
  },
])

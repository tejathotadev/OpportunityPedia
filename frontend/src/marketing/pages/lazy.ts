import { lazy } from 'react'

/**
 * Route-level code splitting for the public site. The homepage is imported
 * eagerly by the router — it is the first paint — so it is absent here.
 */
export const ProductsPage = lazy(() => import('./Products/ProductsPage'))
export const OpportunityXPage = lazy(() => import('./Products/OpportunityXPage'))
export const CompanyPage = lazy(() => import('./Company/CompanyPage'))
export const CareersPage = lazy(() => import('./Careers/CareersPage'))
export const ContactPage = lazy(() => import('./Contact/ContactPage'))
export const PrivacyPage = lazy(() => import('./Legal/PrivacyPage'))
export const TermsPage = lazy(() => import('./Legal/TermsPage'))
export const NotFoundPage = lazy(() => import('./NotFound/NotFoundPage'))

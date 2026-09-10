/**
 * Single source of truth for navigation, product links and copy that repeats
 * across the marketing site.
 *
 * Brand roles:
 *   OpportunityX     — company / this website
 *   OpportunityPedia — flagship product (`/app`)
 */
export const site = {
  name: 'OpportunityX',
  productName: 'OpportunityPedia',
  tagline: 'We make opportunity easier to see.',
  description:
    'OpportunityX builds products that help teams see business opportunity clearly — and act on it before it disappears.',
  footerDescription: 'Building products that make opportunity easier to see and act on.',
  copyrightYear: 2026,
  /** Live product entry — "go use it", not the marketing overview. */
  productAppUrl: '/app/overview',
  /** @deprecated Use productAppUrl. Kept so older imports keep compiling. */
  opportunityXAppUrl: '/app/overview',
} as const;

export type NavItem = { label: string; to: string };

export const primaryNav: NavItem[] = [
  { label: 'Products', to: '/products' },
  { label: 'Company', to: '/company' },
  { label: 'Careers', to: '/careers' },
  { label: 'Contact', to: '/contact' },
];

export const footerNav: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Company',
    items: [
      { label: 'About', to: '/company' },
      { label: 'Careers', to: '/careers' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    heading: 'Products',
    items: [{ label: 'OpportunityPedia', to: '/products/opportunitypedia' }],
  },
  {
    heading: 'Legal',
    items: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
];

import { flagshipProduct, products } from '@/marketing/data/products';

/**
 * Single source of truth for navigation, company identity and copy that
 * repeats across the marketing site.
 *
 * Brand roles:
 *   OpportunityX     — the company, and this website
 *   OpportunityPedia — a product of OpportunityX (`/app`)
 *
 * Products are listed in `products.ts`; nothing here should describe a
 * product as the company.
 */
export const site = {
  name: 'OpportunityX',
  tagline: 'We make opportunity easier to see.',
  description:
    'OpportunityX is a technology company that builds products to help teams see business opportunity clearly — and act on it before it disappears.',
  footerDescription: 'A technology company building products that make opportunity easier to see and act on.',
  copyrightYear: 2026,
  /** Live product entry — "go use it", not the marketing overview. */
  productAppUrl: flagshipProduct.appUrl ?? flagshipProduct.path,
} as const;

/** Registered company details. Supplied by the company; do not edit without confirmation. */
export const legalEntity = {
  name: 'OpportunityX Private Limited',
  cin: 'U62011TS2026PTC221917',
  addressLines: [
    'Plot No. 901, Flat No. 302,',
    'Ayyappa Society, Madhapur, Shaikpet,',
    'Hyderabad – 500081, Telangana, India',
  ],
} as const;

export const copyrightNotice = `© ${site.copyrightYear} ${legalEntity.name}. All rights reserved.`;

export type NavItem = {
  label: string;
  to: string;
  /** Nested links, e.g. individual products under Products. */
  children?: NavItem[];
};

const productLinks: NavItem[] = products.map((p) => ({ label: p.name, to: p.path }));

export const primaryNav: NavItem[] = [
  { label: 'Company', to: '/company' },
  { label: 'Products', to: '/products', children: productLinks },
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
    items: [{ label: 'All products', to: '/products' }, ...productLinks],
  },
  {
    heading: 'Legal',
    items: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
];

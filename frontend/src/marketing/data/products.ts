/**
 * Products and services offered by OpportunityX.
 *
 * Navigation, the footer and the Products page all read from this list, so a
 * new offering is one entry here plus its page under `pages/Products/`.
 * Only list offerings that exist and can be used today.
 */
export type Product = {
  slug: string;
  name: string;
  /** One line used in menus and cards. */
  tagline: string;
  /**
   * Product positioning statement. Describes the product as a whole; must not
   * imply that every feature is automated or AI-driven.
   */
  positioning: string;
  /** Short paragraph for previews such as the Products page accordion. */
  summary: string;
  /**
   * Key capabilities shown in previews. Each must match shipped behaviour and
   * describe customer value without naming data sources.
   */
  highlights: readonly { title: string; body: string }[];
  /** Marketing page on this site. */
  path: string;
  /** Where an existing customer goes to use the product, if it is self-serve. */
  appUrl?: string;
  /** Where a new customer starts, if sign-up is self-serve. */
  signupUrl?: string;
  flagship?: boolean;
};

export const products: readonly Product[] = [
  {
    slug: 'opportunitypedia',
    name: 'OpportunityPedia',
    tagline: 'Find, prioritize and act on opportunities — in one place.',
    positioning: 'AI-powered opportunity intelligence for better decisions and greater impact.',
    summary:
      'OpportunityPedia gives teams one place to discover opportunities, decide what needs attention first, and follow through without losing context.',
    highlights: [
      {
        title: 'Opportunity intelligence',
        body: 'Relevant opportunities in one workspace, instead of many places.',
      },
      {
        title: 'Signals & intent',
        body: 'See the signals and intent that show why an opportunity matters.',
      },
      {
        title: 'Evidence',
        body: 'Review the supporting context before your team takes action.',
      },
      {
        title: 'Prioritization',
        body: 'A clear priority level shows what needs attention first.',
      },
      {
        title: 'Workflow',
        body: 'Assign an owner, track progress and follow up in one place.',
      },
    ],
    path: '/products/opportunitypedia',
    appUrl: '/app/overview',
    signupUrl: '/get-started',
    flagship: true,
  },
];

export const flagshipProduct: Product = products.find((p) => p.flagship) ?? products[0];

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
    path: '/products/opportunitypedia',
    appUrl: '/app/overview',
    signupUrl: '/get-started',
    flagship: true,
  },
];

export const flagshipProduct: Product = products.find((p) => p.flagship) ?? products[0];

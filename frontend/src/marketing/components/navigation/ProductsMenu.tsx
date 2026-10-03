import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductMark } from '@/shared/brand/Logo';
import { products } from '@/marketing/data/products';
import { track } from '@/marketing/lib/analytics';

type ProductsMenuProps = {
  id: string;
  /** Called after a link is chosen. */
  onDismiss: () => void;
  /** Called on Escape so the trigger can take focus back. */
  onEscape: () => void;
};

/**
 * Compact Products dropdown: one row per product in the registry. Product
 * detail lives on /products and each product page, not here.
 */
export function ProductsMenu({ id, onDismiss, onEscape }: ProductsMenuProps) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onEscape]);

  return (
    <div id={id} className="absolute top-full left-0 w-80 pt-2">
      <div className="overflow-hidden rounded-control border border-mist bg-white shadow-[0_12px_32px_-20px_rgba(17,24,39,0.3)]">
        <ul aria-label="Products" className="divide-y divide-mist">
          {products.map((product) => (
            <li key={product.slug}>
              <Link
                to={product.path}
                onClick={() => {
                  track('nav_product_click', { product: product.slug, surface: 'navbar_menu' });
                  onDismiss();
                }}
                className="group flex items-center justify-between gap-4 px-5 py-5 transition-colors hover:bg-paper focus-visible:bg-paper focus-visible:outline-offset-[-2px]"
              >
                <span className="flex flex-col gap-1">
                  <ProductMark name={product.name} className="text-[1.0625rem]" />
                  <span className="label-meta text-graphite">An OpportunityX product</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-graphite transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                />
              </Link>
            </li>
          ))}
        </ul>
        {products.length > 1 ? (
          <Link
            to="/products"
            onClick={onDismiss}
            className="flex min-h-11 items-center justify-between border-t border-mist bg-paper px-5 text-sm text-graphite transition-colors hover:text-ink focus-visible:text-ink"
          >
            All OpportunityX products
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

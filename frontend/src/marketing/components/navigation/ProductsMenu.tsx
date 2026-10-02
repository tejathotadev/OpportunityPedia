import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductMark } from '@/shared/brand/Logo';
import { products } from '@/marketing/data/products';
import { track } from '@/marketing/lib/analytics';

type ProductsMenuProps = {
  id: string;
  onDismiss: () => void;
};

/** Products mega menu, built from the product registry. */
export function ProductsMenu({ id, onDismiss }: ProductsMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <div
      id={id}
      ref={panelRef}
      className="absolute top-full left-0 w-[min(38rem,calc(100vw-3rem))] pt-3"
    >
      <div className="border border-mist bg-white shadow-[0_16px_40px_-28px_rgba(17,24,39,0.28)]">
        <ul className="divide-y divide-mist">
          {products.map((product) => (
            <li key={product.slug}>
              <Link
                to={product.path}
                onClick={() => {
                  track('nav_product_click', { product: product.slug });
                  onDismiss();
                }}
                className="group block p-6 transition-colors hover:bg-paper focus-visible:bg-paper"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <ProductMark name={product.name} className="text-[1.25rem]" />
                    <p className="label-meta mt-1.5 text-graphite/70">An OpportunityX product</p>
                    <p className="mt-2.5 max-w-sm text-[0.9375rem] leading-relaxed text-graphite">
                      {product.tagline}
                    </p>
                  </div>
                  {product.flagship ? (
                    <span className="label-meta shrink-0 border border-forest/25 bg-forest/[0.06] px-2 py-1 text-forest">
                      Flagship
                    </span>
                  ) : null}
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-forest">
                  Explore {product.name}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          to="/products"
          onClick={onDismiss}
          className="flex min-h-11 items-center justify-between border-t border-mist bg-paper px-6 text-sm text-graphite transition-colors hover:text-ink focus-visible:text-ink"
        >
          All OpportunityX products
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </div>
  );
}

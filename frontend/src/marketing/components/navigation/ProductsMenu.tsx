import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { OpportunityPediaMark } from '@/shared/brand/Logo';
import { track } from '@/marketing/lib/analytics';

type ProductsMenuProps = {
  id: string;
  onDismiss: () => void;
};

/**
 * Products mega menu. Only the flagship product is listed.
 */
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
        <Link
          to="/products/opportunitypedia"
          onClick={() => {
            track('nav_product_click', { product: 'opportunitypedia' });
            onDismiss();
          }}
          className="group block p-6 transition-colors hover:bg-paper focus-visible:bg-paper"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <OpportunityPediaMark className="text-[1.25rem]" />
              <p className="mt-2.5 max-w-sm text-[0.9375rem] leading-relaxed text-graphite">
                Find, prioritize and act on opportunities — in one place.
              </p>
            </div>
            <span className="label-meta shrink-0 border border-forest/25 bg-forest/[0.06] px-2 py-1 text-forest">
              Flagship
            </span>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-forest">
            Explore OpportunityPedia
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:translate-x-1"
            />
          </span>
        </Link>
      </div>
    </div>
  );
}

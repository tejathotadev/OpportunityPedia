import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Accordion, type AccordionItem } from '@/marketing/components/common/Accordion';
import { LinkButton } from '@/marketing/components/common/Button';
import { ProductMark } from '@/shared/brand/Logo';
import { workflowStages } from '@/marketing/data/content';
import { flagshipProduct, products, type Product } from '@/marketing/data/products';
import { track } from '@/marketing/lib/analytics';

const MORE_ID = 'more-products';

function ProductHeader({ product }: { product: Product }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span className="flex flex-col gap-1">
        <ProductMark name={product.name} className="text-[1.25rem] md:text-[1.375rem]" />
        <span className="label-meta text-graphite">An OpportunityX product</span>
      </span>
      {product.flagship ? (
        <span className="label-meta border border-forest/25 bg-forest/[0.06] px-2 py-1 text-forest">
          Flagship
        </span>
      ) : null}
    </span>
  );
}

/** Static marketing visual — the product loop, not live data. */
function ProductStage({ product }: { product: Product }) {
  return (
    <Link
      to={product.path}
      tabIndex={-1}
      aria-hidden="true"
      onClick={() => track('nav_product_click', { product: product.slug, surface: 'products_accordion_visual' })}
      className="group block bg-navy-deep p-5 transition-colors hover:bg-navy md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <ProductMark name={product.name} tone="inverse" className="text-[1.0625rem]" />
        <ArrowRight className="size-4 text-teal transition-transform duration-200 group-hover:translate-x-1" />
      </div>
      <ol className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 lg:mt-5 lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
        {workflowStages.map((stage) => (
          <li key={stage.index} className="flex flex-col gap-1 px-3 py-3 first:pl-0 lg:flex-row lg:gap-4 lg:px-0 lg:py-3.5">
            <span className="label-meta pt-0.5 text-white/60">{stage.index}</span>
            <span>
              <span className="block text-[0.9375rem] font-semibold text-white">{stage.title}</span>
              <span className="mt-1 hidden text-sm leading-relaxed text-white/60 lg:block">
                {stage.body}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Link>
  );
}

function ProductPanel({ product }: { product: Product }) {
  return (
    <div className="grid gap-8 px-5 pt-2 pb-7 md:px-7 md:pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12">
      <div>
        <p className="max-w-[34rem] text-[1.125rem] leading-snug font-medium tracking-[-0.01em] text-ink md:text-[1.25rem]">
          {product.positioning}
        </p>
        <p className="mt-3 hidden max-w-[36rem] text-[0.9375rem] leading-relaxed text-graphite sm:block">
          {product.summary}
        </p>

        <h4 className="label-meta mt-6 text-ink">Key capabilities</h4>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 sm:gap-x-6">
          {product.highlights.map((item) => (
            <li key={item.title} className="flex gap-2.5 text-[0.9375rem] leading-snug">
              <span aria-hidden="true" className="mt-[0.45rem] size-1.5 shrink-0 bg-teal-ink" />
              <span>
                <span className="font-medium text-ink">{item.title}</span>
                <span className="hidden text-graphite sm:block">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <LinkButton
            to={product.path}
            arrow="right"
            onClick={() => track('nav_product_click', { product: product.slug, surface: 'products_accordion' })}
          >
            View {product.name}
          </LinkButton>
          {product.signupUrl ? (
            <LinkButton to={product.signupUrl} variant="secondary">
              Start free plan
            </LinkButton>
          ) : null}
        </div>
      </div>

      <ProductStage product={product} />
    </div>
  );
}

/** Products page selector: one row per entry in `data/products.ts`. */
export function ProductAccordion() {
  const items: AccordionItem[] = [
    ...products.map((product) => ({
      id: product.slug,
      header: <ProductHeader product={product} />,
      panel: <ProductPanel product={product} />,
    })),
    {
      id: MORE_ID,
      header: (
        <span className="flex flex-col gap-1">
          <span className="text-[1.125rem] font-semibold tracking-[-0.02em] text-ink">
            More products and services
          </span>
          <span className="label-meta text-graphite">From OpportunityX</span>
        </span>
      ),
      panel: (
        <p className="max-w-[40rem] px-5 pt-1 pb-7 text-[1.0625rem] leading-relaxed text-graphite md:px-7">
          More products and services are being developed. New OpportunityX products and services
          will be listed here when there is something real to use.
        </p>
      ),
    },
  ];

  return <Accordion items={items} defaultOpenId={flagshipProduct.slug} />;
}

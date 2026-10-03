import { PageHero } from '@/marketing/components/sections/PageHero';
import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { LinkButton } from '@/marketing/components/common/Button';
import { Reveal } from '@/marketing/components/common/Reveal';
import { ProductCard } from '@/marketing/components/common/ProductCard';
import { OpportunityPediaMark, ProductMark } from '@/shared/brand/Logo';
import { ProductOutcomes } from '@/marketing/components/visuals/ProductOutcomes';
import { HowItWorks } from '@/marketing/components/sections/HowItWorks';
import { FinalCta } from '@/marketing/components/sections/FinalCta';
import { flagshipProduct, products } from '@/marketing/data/products';
import { useSeo } from '@/marketing/hooks/useSeo';
import { track } from '@/marketing/lib/analytics';

export default function ProductsPage() {
  useSeo({
    title: 'Products',
    description:
      'Products from OpportunityX. OpportunityPedia, our flagship product, helps teams find, prioritize and act on business opportunities.',
    path: '/products',
  });

  return (
    <>
      <PageHero
        eyebrow="OPPORTUNITYX PRODUCTS"
        headline="Products built around opportunity."
        lead="OpportunityX builds tools that help teams see what matters and act on it. OpportunityPedia is the first."
        index={[
          { key: 'Company', value: 'OpportunityX' },
          {
            key: 'Available',
            value: `${products.length} ${products.length === 1 ? 'product' : 'products'}`,
          },
        ]}
      />

      <Section divider surface="white" aria-labelledby="flagship-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="label-meta inline-block border border-forest/25 bg-paper px-2.5 py-1.5 text-forest">
                Flagship product
              </p>
              <div className="mt-5">
                <OpportunityPediaMark className="text-[1.75rem]" />
              </div>
              <p className="label-meta mt-2.5 text-graphite/70">An OpportunityX product</p>
              <EditorialHeading id="flagship-heading" size="display" className="mt-6">
                Find what matters. Act together.
              </EditorialHeading>
              <p className="mt-6 max-w-[34rem] text-lead text-graphite">
                OpportunityPedia gives teams one place to discover opportunities, decide what needs
                attention first, and follow through without losing context.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <LinkButton
                  to="/products/opportunitypedia"
                  size="lg"
                  onClick={() => track('nav_product_click', { surface: 'products_page' })}
                >
                  Explore OpportunityPedia
                </LinkButton>
                {flagshipProduct.signupUrl ? (
                  <LinkButton to={flagshipProduct.signupUrl} variant="secondary" size="lg">
                    Start free plan
                  </LinkButton>
                ) : null}
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={100}>
              <div className="bg-navy-deep p-3 md:p-4">
                <ProductOutcomes />
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <HowItWorks />

      <Section divider surface="paper" aria-labelledby="all-products-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Reveal>
              <SectionLabel>ALL PRODUCTS</SectionLabel>
              <EditorialHeading id="all-products-heading" size="display" className="mt-6 max-w-[16ch]">
                More products and services are being developed.
              </EditorialHeading>
              <p className="mt-6 max-w-[32rem] text-lead text-graphite">
                New OpportunityX products and services will be listed here when there is something
                real to use.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <ul className="grid gap-px bg-mist">
              {products.map((product, i) => (
                <Reveal as="li" key={product.slug} delay={i * 80}>
                  <ProductCard
                    status={product.flagship ? 'Available · Flagship' : 'Available'}
                    wordmark={<ProductMark name={product.name} tone="inverse" />}
                    description={product.tagline}
                    action={
                      <LinkButton
                        to={product.path}
                        variant="inverse"
                        arrow="right"
                        className="bg-teal text-navy-deep hover:bg-teal-deep"
                        onClick={() =>
                          track('nav_product_click', { product: product.slug, surface: 'products_list' })
                        }
                      >
                        Explore
                      </LinkButton>
                    }
                  />
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}

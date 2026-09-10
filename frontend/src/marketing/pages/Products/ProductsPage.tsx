import { PageHero } from '@/marketing/components/sections/PageHero';
import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { LinkButton } from '@/marketing/components/common/Button';
import { Reveal } from '@/marketing/components/common/Reveal';
import { ProductCard } from '@/marketing/components/common/ProductCard';
import { OpportunityPediaMark } from '@/shared/brand/Logo';
import { OpportunityXUI } from '@/marketing/components/visuals/OpportunityXUI';
import { HowItWorks } from '@/marketing/components/sections/HowItWorks';
import { FinalCta } from '@/marketing/components/sections/FinalCta';
import { site } from '@/marketing/data/site';
import { useSeo } from '@/marketing/hooks/useSeo';
import { track } from '@/marketing/lib/analytics';

export default function ProductsPage() {
  useSeo({
    title: 'Products',
    description:
      'OpportunityPedia is the flagship product from OpportunityX — helping teams find, prioritize and act on business opportunities.',
    path: '/products',
  });

  return (
    <>
      <PageHero
        eyebrow="OUR PRODUCTS"
        headline="Products built around opportunity."
        lead="OpportunityX builds tools that help teams see what matters and act on it. OpportunityPedia is the first."
        index={[
          { key: 'Active', value: '1 product' },
          { key: 'In development', value: 'Unannounced' },
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
                <LinkButton to="/contact" variant="secondary" size="lg">
                  Request access
                </LinkButton>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal delay={100}>
              <div className="bg-navy-deep p-3 md:p-4">
                <OpportunityXUI />
              </div>
              <p className="mt-3 text-xs text-graphite">
                Illustrative interface. Content shown is representative, not live data.
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

      <HowItWorks />

      <Section divider surface="paper" aria-labelledby="whats-next-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Reveal>
              <SectionLabel>WHAT&rsquo;S NEXT</SectionLabel>
              <EditorialHeading id="whats-next-heading" size="display" className="mt-6 max-w-[16ch]">
                The roadmap is deliberately unnamed.
              </EditorialHeading>
              <p className="mt-6 max-w-[32rem] text-lead text-graphite">
                We are researching further products. We will name them when there is something real
                to use.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7 lg:col-start-6">
            <div className="grid gap-px bg-mist sm:grid-cols-2">
              <Reveal className="sm:col-span-2">
                <ProductCard
                  status="Active · Flagship"
                  wordmark={<OpportunityPediaMark tone="inverse" />}
                  description="Find, prioritize and act on opportunities — in one place."
                  action={
                    <LinkButton
                      to={site.productAppUrl}
                      variant="inverse"
                      arrow="right"
                      className="bg-teal text-navy-deep hover:bg-teal-deep"
                    >
                      Explore
                    </LinkButton>
                  }
                />
              </Reveal>
              <Reveal delay={80}>
                <ProductCard
                  status="In development"
                  tone="placeholder"
                  wordmark={
                    <span className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink/40">
                      Unannounced
                    </span>
                  }
                  description="More products from OpportunityX — named when ready."
                />
              </Reveal>
              <Reveal delay={140}>
                <ProductCard
                  status="In development"
                  tone="placeholder"
                  wordmark={
                    <span className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink/40">
                      Unannounced
                    </span>
                  }
                  description="Research continues. Nothing invented for the brochure."
                />
              </Reveal>
            </div>
          </div>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}

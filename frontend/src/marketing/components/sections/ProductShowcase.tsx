import { Container } from '@/marketing/components/layout/Container';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { LinkButton } from '@/marketing/components/common/Button';
import { Reveal } from '@/marketing/components/common/Reveal';
import { OpportunityPediaMark } from '@/shared/brand/Logo';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { ProductOutcomes } from '@/marketing/components/visuals/ProductOutcomes';
import { site } from '@/marketing/data/site';
import { track } from '@/marketing/lib/analytics';

/**
 * The flagship product section. The dark stage below the copy holds outcomes
 * only — no product chrome and no collection methods.
 */
export function ProductShowcase() {
  return (
    <section
      id="opportunitypedia"
      aria-labelledby="product-heading"
      className="border-t border-mist bg-paper-warm py-section"
    >
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Reveal>
              <SectionLabel index="03">OUR PRODUCTS</SectionLabel>
              <p className="label-meta mt-8 inline-block border border-forest/25 bg-white px-2.5 py-1.5 text-forest">
                Flagship product
              </p>
              <div className="mt-5">
                <OpportunityPediaMark className="text-[1.75rem]" />
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-8">
            <Reveal>
              <EditorialHeading id="product-heading" size="display">
                Meet OpportunityPedia.
              </EditorialHeading>
              <p className="mt-6 max-w-[40rem] text-lead text-graphite">
                OpportunityPedia gives teams one place to discover, prioritize, assign and act on
                business opportunities.
              </p>
              <p className="mt-4 max-w-[40rem] text-[1.0625rem] leading-relaxed text-graphite">
                Instead of searching across disconnected resources and manually coordinating
                outreach, teams can move from signal to action within one workflow.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <LinkButton
                  to={site.productAppUrl}
                  size="lg"
                  onClick={() => track('nav_product_click', { surface: 'showcase' })}
                >
                  Explore OpportunityPedia
                </LinkButton>
                <LinkButton to="/products" variant="secondary" size="lg">
                  View product overview
                </LinkButton>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>

      <Container width="wide" className="mt-14 md:mt-20">
        <Reveal>
          <div className="bg-navy-deep p-3 md:p-5 lg:p-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="label-meta text-white/45">OpportunityPedia · What teams get</p>
              <SignalIndex
                tone="inverse"
                entries={[
                  { key: 'Product', value: 'OpportunityPedia' },
                  { key: 'By', value: 'OpportunityX' },
                ]}
              />
            </div>
            <ProductOutcomes />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

import { PageHero } from '@/marketing/components/sections/PageHero';
import { Section } from '@/marketing/components/layout/Section';
import { Container } from '@/marketing/components/layout/Container';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { LinkButton } from '@/marketing/components/common/Button';
import { Reveal } from '@/marketing/components/common/Reveal';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { OpportunityPediaMark } from '@/shared/brand/Logo';
import { ProductInteractionPreview } from '@/marketing/components/visuals/ProductInteractionPreview';
import { HowItWorks } from '@/marketing/components/sections/HowItWorks';
import { BenefitGrid } from '@/marketing/components/sections/BenefitGrid';
import { FinalCta } from '@/marketing/components/sections/FinalCta';
import { site } from '@/marketing/data/site';
import { useSeo } from '@/marketing/hooks/useSeo';
import { track } from '@/marketing/lib/analytics';

/**
 * Marketing page for OpportunityPedia — outcomes and access only.
 * Collection methods and signal taxonomies stay out of public copy.
 */
export default function OpportunityXPage() {
  useSeo({
    title: 'OpportunityPedia — Find and act on opportunity',
    description:
      'OpportunityPedia helps teams discover, prioritize and act on business opportunities in one coordinated workflow. The flagship product from OpportunityX.',
    path: '/products/opportunitypedia',
  });

  return (
    <>
      <PageHero
        surface="navy"
        eyebrow="OPPORTUNITYPEDIA"
        headline="Find what matters. Act before it disappears."
        lead="One place for your team to discover opportunities, decide what needs attention first, and follow through together."
        actions={
          <>
            <LinkButton
              to={site.productAppUrl}
              size="lg"
              className="bg-teal text-navy-deep hover:bg-teal-deep"
              onClick={() => track('nav_product_click', { surface: 'product_hero' })}
            >
              Open OpportunityPedia
            </LinkButton>
            <LinkButton to="/contact" variant="inverse-outline" size="lg">
              Request access
            </LinkButton>
          </>
        }
        index={[
          { key: 'Product', value: 'OpportunityPedia' },
          { key: 'By', value: 'OpportunityX' },
          { key: 'Status', value: 'Flagship' },
        ]}
      />

      <section className="op-stage border-t border-white/10 bg-navy-deep py-14 md:py-20">
        <Container width="wide">
          <Reveal>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <OpportunityPediaMark tone="inverse" className="text-[1.125rem]" />
                <span aria-hidden="true" className="text-white/20">
                  /
                </span>
                <p className="label-meta text-white/45">Product walkthrough</p>
              </div>
              <SignalIndex tone="inverse" entries={[{ key: 'Data', value: 'Illustrative' }]} />
            </div>
            <ProductInteractionPreview />
          </Reveal>
        </Container>
      </section>

      <div id="how-it-works">
        <HowItWorks />
      </div>

      <BenefitGrid />

      <Section divider surface="paper" aria-labelledby="access-heading">
        <div className="max-w-[42rem]">
          <Reveal>
            <SectionLabel>ACCESS</SectionLabel>
            <EditorialHeading id="access-heading" size="display" className="mt-6">
              Talk to us about early access.
            </EditorialHeading>
            <p className="mt-6 text-lead text-graphite">
              OpportunityPedia is being built with a small number of teams. Tell us how your team
              finds opportunities today and we will follow up directly.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <LinkButton to="/contact" size="lg">
                Request access
              </LinkButton>
              <LinkButton to="/company" variant="secondary" size="lg">
                About OpportunityX
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}

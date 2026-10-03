import { PageHero } from '@/marketing/components/sections/PageHero';
import { Section } from '@/marketing/components/layout/Section';
import { Container } from '@/marketing/components/layout/Container';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { LinkButton } from '@/marketing/components/common/Button';
import { Reveal } from '@/marketing/components/common/Reveal';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { OpportunityPediaMark } from '@/shared/brand/Logo';
import { ProductOutcomes } from '@/marketing/components/visuals/ProductOutcomes';
import { HowItWorks } from '@/marketing/components/sections/HowItWorks';
import { BenefitGrid } from '@/marketing/components/sections/BenefitGrid';
import { FinalCta } from '@/marketing/components/sections/FinalCta';
import { productCapabilities } from '@/marketing/data/content';
import { flagshipProduct } from '@/marketing/data/products';
import { site } from '@/marketing/data/site';
import { useSeo } from '@/marketing/hooks/useSeo';
import { track } from '@/marketing/lib/analytics';

/**
 * Product page for OpportunityPedia, an OpportunityX product.
 *
 * Capabilities describe customer value as seen in the app. Do not name data
 * sources or collection details, and do not add a capability until it ships.
 */
export default function OpportunityPediaPage() {
  useSeo({
    title: 'OpportunityPedia — an OpportunityX product',
    description:
      'OpportunityPedia, an OpportunityX product: AI-powered opportunity intelligence that helps teams discover, prioritize and act on business opportunities in one workflow.',
    path: flagshipProduct.path,
    standaloneTitle: true,
  });

  return (
    <>
      <PageHero
        surface="navy"
        eyebrow="OPPORTUNITYPEDIA · AN OPPORTUNITYX PRODUCT"
        headline="Find what matters. Act before it disappears."
        lead={
          <>
            <span className="block font-medium text-white">{flagshipProduct.positioning}</span>
            <span className="mt-3 block">
              One place for your team to discover opportunities, decide what needs attention first,
              and follow through together.
            </span>
          </>
        }
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
            {flagshipProduct.signupUrl ? (
              <LinkButton to={flagshipProduct.signupUrl} variant="inverse-outline" size="lg">
                Start free plan
              </LinkButton>
            ) : null}
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
                <h2 className="label-meta text-white/60">What teams get</h2>
              </div>
              <SignalIndex
                tone="inverse"
                entries={[
                  { key: 'Product', value: 'OpportunityPedia' },
                  { key: 'By', value: 'OpportunityX' },
                ]}
              />
            </div>
            <ProductOutcomes />
          </Reveal>
        </Container>
      </section>

      <Section divider surface="white" aria-labelledby="problem-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Reveal>
              <SectionLabel>THE PROBLEM</SectionLabel>
            </Reveal>
          </div>
          <div className="lg:col-span-8">
            <Reveal>
              <EditorialHeading id="problem-heading" size="display" className="max-w-[22ch]">
                The opportunities are out there. Finding them in time is not.
              </EditorialHeading>
              <div className="mt-10 grid max-w-[56rem] gap-8 border-t border-mist pt-8 md:grid-cols-2 md:gap-12">
                <p className="text-lead text-graphite">
                  New opportunities appear every day, scattered across many places. Checking them
                  by hand takes hours, and the useful ones are easy to miss.
                </p>
                <p className="text-lead text-graphite">
                  Even when a team finds one, it rarely knows who already picked it up. OpportunityPedia
                  brings discovery, prioritization and follow-through into one place.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <div id="how-it-works">
        <HowItWorks />
      </div>

      <Section divider surface="paper" aria-labelledby="capabilities-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <Reveal>
              <SectionLabel>CAPABILITIES</SectionLabel>
              <EditorialHeading id="capabilities-heading" size="display" className="mt-6 max-w-[18ch]">
                Everything your team needs to act on opportunities.
              </EditorialHeading>
              <p className="mt-6 max-w-[30rem] text-lead text-graphite">
                Discover what matters, understand the context, prioritize your work and move
                opportunities forward — all in one place.
              </p>
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <ul className="border-t border-mist">
              {productCapabilities.map((capability, i) => (
                <Reveal
                  as="li"
                  key={capability.title}
                  delay={Math.min(i, 4) * 60}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-mist py-7 md:grid-cols-[3.5rem_minmax(0,13rem)_minmax(0,1fr)] md:gap-x-6"
                >
                  <span className="label-meta pt-1 text-ink">{capability.index}</span>
                  <div>
                    <h3 className="text-[1.1875rem] leading-snug font-semibold tracking-[-0.015em]">
                      {capability.title}
                    </h3>
                    <p className="label-meta mt-1.5 text-forest">{capability.category}</p>
                  </div>
                  <p className="col-start-2 mt-2 text-[0.9375rem] leading-relaxed text-graphite md:col-start-3 md:mt-0 md:pt-0.5">
                    {capability.body}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <BenefitGrid />

      <Section divider surface="white" aria-labelledby="audience-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Reveal>
              <SectionLabel>WHO IT&rsquo;S FOR</SectionLabel>
            </Reveal>
          </div>
          <div className="lg:col-span-8">
            <Reveal>
              <EditorialHeading id="audience-heading" size="display" className="max-w-[22ch]">
                Built for teams that pursue opportunity for a living.
              </EditorialHeading>
              <p className="mt-6 max-w-[40rem] text-lead text-graphite">
                Business development and sales teams — particularly staffing and services firms —
                that need to spot the right opportunities early and follow them up as a team.
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

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
              <LinkButton to="/get-started" size="lg">
                Start free plan
              </LinkButton>
              <LinkButton to="/company" variant="secondary" size="lg">
                About OpportunityX
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </Section>

      <FinalCta primary={{ label: 'Open OpportunityPedia', to: site.productAppUrl }} />
    </>
  );
}

import { PageHero } from '@/marketing/components/sections/PageHero';
import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading, SerifAccent } from '@/marketing/components/common/EditorialHeading';
import { LinkButton } from '@/marketing/components/common/Button';
import { Reveal } from '@/marketing/components/common/Reveal';
import { Philosophy } from '@/marketing/components/sections/Philosophy';
import { FinalCta } from '@/marketing/components/sections/FinalCta';
import { useSeo } from '@/marketing/hooks/useSeo';

export default function CompanyPage() {
  useSeo({
    title: 'Company',
    description:
      'OpportunityX builds products that make business opportunity easier to see and act on. Meet the team behind OpportunityPedia.',
    path: '/company',
  });

  return (
    <>
      <PageHero
        eyebrow="COMPANY"
        headline="We believe the next opportunity should be easier to find."
        lead="OpportunityX builds products that help teams see what matters — and act before it disappears."
        index={[
          { key: 'Company', value: 'OpportunityX' },
          { key: 'Flagship', value: 'OpportunityPedia' },
          { key: 'Stage', value: 'Building' },
        ]}
      />

      <Section divider surface="white" aria-labelledby="thesis-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-3">
            <Reveal>
              <SectionLabel index="01">OUR THESIS</SectionLabel>
            </Reveal>
          </div>
          <div className="lg:col-span-9">
            <Reveal>
              <EditorialHeading id="thesis-heading" size="display" className="max-w-[24ch]">
                The problem was never a shortage of{' '}
                <SerifAccent>information</SerifAccent>.
              </EditorialHeading>

              <div className="mt-10 grid max-w-[56rem] gap-8 border-t border-mist pt-8 md:grid-cols-2 md:gap-12">
                <p className="text-lead text-graphite">
                  The information teams need already exists across the open web. Finding it,
                  trusting it, and acting on it in time is the hard part.
                </p>
                <p className="text-lead text-graphite">
                  What is missing is clarity. OpportunityX exists to turn that scattered picture
                  into a clear next step.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <Section divider surface="paper" aria-labelledby="why-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-3">
            <Reveal>
              <SectionLabel index="02">WHY OPPORTUNITYX</SectionLabel>
            </Reveal>
          </div>
          <div className="lg:col-span-9">
            <Reveal>
              <EditorialHeading id="why-heading" size="display" className="max-w-[22ch]">
                Clarity over volume.
              </EditorialHeading>
              <div className="mt-10 grid max-w-[56rem] gap-8 border-t border-mist pt-8 md:grid-cols-2 md:gap-12">
                <p className="text-lead text-graphite">
                  We build for teams who do not need more tabs open — they need a shorter path from
                  &ldquo;something changed&rdquo; to &ldquo;here is what we do next.&rdquo;
                </p>
                <p className="text-lead text-graphite">
                  OpportunityPedia is our first product: one place to discover opportunities,
                  prioritize what matters, and follow through together.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <Philosophy />

      <Section divider surface="white" aria-labelledby="building-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-3">
            <Reveal>
              <SectionLabel index="03">WHAT WE&rsquo;RE BUILDING</SectionLabel>
            </Reveal>
          </div>
          <div className="lg:col-span-9">
            <Reveal>
              <EditorialHeading id="building-heading" size="display" className="max-w-[22ch]">
                Building products around opportunity.
              </EditorialHeading>
              <div className="mt-10 grid max-w-[56rem] gap-8 border-t border-mist pt-8 md:grid-cols-2 md:gap-12">
                <p className="text-lead text-graphite">
                  OpportunityX started from a simple observation: teams spend enormous amounts of
                  time searching for information that already exists.
                </p>
                <p className="text-lead text-graphite">
                  Our goal is to organize that into products that help people understand what
                  matters, when it matters, and what to do next.
                </p>
              </div>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <LinkButton to="/products/opportunitypedia" size="lg">
                  Explore OpportunityPedia
                </LinkButton>
                <LinkButton to="/careers" variant="secondary" size="lg">
                  Join the team
                </LinkButton>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <FinalCta />
    </>
  );
}

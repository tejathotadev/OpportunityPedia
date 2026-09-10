import { Container } from '@/marketing/components/layout/Container';
import { LinkButton } from '@/marketing/components/common/Button';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { OpportunityAtlas } from '@/marketing/components/visuals/OpportunityAtlas';
import { site } from '@/marketing/data/site';
import { track } from '@/marketing/lib/analytics';

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="field-grid pointer-events-none absolute inset-0 opacity-[0.55] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
      />

      <Container width="wide" className="relative">
        <div className="grid items-center gap-12 pt-12 pb-16 md:pt-16 md:pb-20 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-14 lg:pt-20 lg:pb-24">
          <div className="max-w-[36rem]">
            <SectionLabel>OPPORTUNITYX</SectionLabel>

            <EditorialHeading
              as="h1"
              size="hero"
              id="hero-heading"
              className="mt-6 text-balance md:mt-7"
            >
              {site.tagline}
            </EditorialHeading>

            <p className="mt-6 max-w-[34rem] text-lead text-graphite md:mt-7">
              {site.description}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-9">
              <LinkButton
                to={site.productAppUrl}
                size="lg"
                onClick={() => track('hero_opportunityx_click')}
              >
                Explore OpportunityPedia
              </LinkButton>
              <LinkButton to="/contact" variant="secondary" size="lg">
                Talk to us
              </LinkButton>
            </div>

            <p className="mt-8 max-w-[28rem] border-t border-mist pt-5 text-sm text-graphite">
              Built for teams that need to move before the opportunity disappears.
            </p>
          </div>

          <div className="lg:pl-4">
            <OpportunityAtlas />
          </div>
        </div>
      </Container>
    </section>
  );
}

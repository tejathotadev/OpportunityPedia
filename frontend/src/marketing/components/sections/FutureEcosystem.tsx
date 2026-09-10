import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { OpportunityXMark } from '@/shared/brand/Logo';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { LinkButton } from '@/marketing/components/common/Button';
import { site } from '@/marketing/data/site';
import { cn } from '@/shared/cn';

/**
 * Communicates that the company is larger than its first product — without
 * naming products that do not exist. The placeholders are explicitly unnamed
 * and carry a research status rather than a roadmap promise.
 */
export function FutureEcosystem() {
  return (
    <Section divider surface="white" aria-labelledby="ecosystem-heading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <Reveal>
            <SectionLabel>MORE FROM OPPORTUNITYPEDIA</SectionLabel>
            <EditorialHeading id="ecosystem-heading" size="display" className="mt-6 max-w-[20ch]">
              OpportunityX is where we&rsquo;re starting.
            </EditorialHeading>
            <p className="mt-6 max-w-[32rem] text-lead text-graphite">
              OpportunityPedia is building a broader intelligence ecosystem around how companies
              discover and act on business opportunity.
            </p>
            <LinkButton to="/products" variant="tertiary" arrow="right" className="mt-7">
              See what we&rsquo;re building
            </LinkButton>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <ol className="grid gap-px bg-mist sm:grid-cols-3">
            {/* The one real product */}
            <Reveal
              as="li"
              className="flex flex-col justify-between bg-navy-deep p-6 sm:col-span-3 sm:flex-row sm:items-end"
            >
              <div>
                <p className="label-meta text-teal">Active · Flagship product</p>
                <div className="mt-4">
                  <OpportunityXMark />
                </div>
                <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-white/60">
                  Opportunity intelligence for teams that move first.
                </p>
              </div>
              <LinkButton
                to={site.opportunityXAppUrl}
                variant="inverse"
                arrow="right"
                className="mt-6 self-start bg-teal text-navy-deep hover:bg-teal-deep sm:mt-0 sm:self-end"
              >
                Explore
              </LinkButton>
            </Reveal>

            {/* Unnamed placeholders — no invented products, no promised features */}
            {[1, 2, 3].map((slot) => (
              <Reveal
                as="li"
                key={slot}
                delay={slot * 80}
                className={cn(
                  'field-dots flex min-h-[11rem] flex-col justify-between bg-paper p-6',
                )}
              >
                <p className="label-meta text-graphite/60">Slot {String(slot).padStart(2, '0')}</p>
                <div>
                  <p className="text-[1.0625rem] leading-snug font-medium text-ink/45">
                    Future intelligence product
                  </p>
                  <SignalIndex className="mt-4" entries={[{ key: 'Status', value: 'Research' }]} />
                </div>
              </Reveal>
            ))}
          </ol>

          <p className="mt-5 text-sm text-graphite">
            Unnamed by design. We will announce a product when there is something real to use.
          </p>
        </div>
      </div>
    </Section>
  );
}

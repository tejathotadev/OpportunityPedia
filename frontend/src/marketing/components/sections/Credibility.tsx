import { ArrowRight } from 'lucide-react';
import { Section } from '@/marketing/components/layout/Section';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { Reveal } from '@/marketing/components/common/Reveal';
import { OpportunityXMark } from '@/shared/brand/Logo';
import { operationalFrictions } from '@/marketing/data/content';

/**
 * Stands in for social proof.
 *
 * There are no customers, logos, testimonials or metrics to show yet, and
 * inventing them would be the fastest way to lose the reader. Instead this
 * states the operational problem the product was built against.
 */
export function Credibility() {
  return (
    <Section divider surface="paper" aria-labelledby="credibility-heading">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <Reveal>
            <SectionLabel>WHERE THIS CAME FROM</SectionLabel>
            <EditorialHeading id="credibility-heading" size="display" className="mt-6 max-w-[18ch]">
              Built around a real operational problem.
            </EditorialHeading>
            <p className="mt-6 max-w-[32rem] text-lead text-graphite">
              Not a market gap found in a slide deck. These are the five failures that repeat in
              almost every team that does opportunity research by hand.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal delay={90}>
            <div className="border border-mist bg-white">
              <ul className="divide-y divide-mist">
                {operationalFrictions.map((friction, i) => (
                  <li key={friction} className="flex items-center gap-4 px-5 py-4">
                    <span className="label-meta text-graphite/50">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[1.0625rem] text-ink">{friction}</span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-4 border-t border-mist bg-navy-deep px-5 py-5">
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-teal" />
                <OpportunityXMark className="[&>span]:text-[1.25rem]" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

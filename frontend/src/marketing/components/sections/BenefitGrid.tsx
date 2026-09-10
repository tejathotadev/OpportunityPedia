import { Section } from '@/marketing/components/layout/Section';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { productBenefits } from '@/marketing/data/content';

/** Outcomes, not a feature list — hence the heading and the absence of icons. */
export function BenefitGrid() {
  return (
    <Section divider surface="paper" aria-labelledby="benefits-heading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <Reveal>
            <EditorialHeading id="benefits-heading" size="display" className="max-w-[18ch]">
              Intelligence that leads somewhere.
            </EditorialHeading>
            <p className="mt-6 max-w-[30rem] text-lead text-graphite">
              What changes for a team using OpportunityPedia, stated as outcomes rather than a
              feature list.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <dl className="border-t border-mist">
            {productBenefits.map((benefit, i) => (
              <Reveal
                key={benefit.title}
                delay={i * 80}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-mist py-7 md:grid-cols-[3.5rem_minmax(0,13rem)_minmax(0,1fr)] md:gap-x-6"
              >
                <span className="label-meta pt-1 text-ink">{benefit.index}</span>
                <dt className="text-[1.1875rem] leading-snug font-semibold tracking-[-0.015em]">
                  {benefit.title}
                </dt>
                <dd className="col-start-2 mt-2 text-[0.9375rem] leading-relaxed text-graphite md:col-start-3 md:mt-0 md:pt-0.5">
                  {benefit.body}
                </dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}

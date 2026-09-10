import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { responsibilityPrinciples } from '@/marketing/data/content';

/**
 * Data responsibility as stated principles.
 *
 * No certification badges appear here — SOC 2, ISO and GDPR claims are absent
 * because none have been achieved. When they are, they belong in this section.
 */
export function DataResponsibility() {
  return (
    <Section divider surface="paper" aria-labelledby="responsibility-heading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <Reveal>
            <SectionLabel>DATA RESPONSIBILITY</SectionLabel>
            <EditorialHeading
              id="responsibility-heading"
              size="display"
              className="mt-6 max-w-[16ch]"
            >
              Intelligence should be traceable.
            </EditorialHeading>
          </Reveal>
        </div>

        <div className="lg:col-span-7 lg:col-start-6">
          <dl className="grid gap-px border-t border-mist bg-mist sm:grid-cols-2">
            {responsibilityPrinciples.map((principle, i) => (
              <Reveal key={principle.title} delay={i * 80} className="bg-paper py-7 sm:px-7">
                <span className="label-meta text-ink">{principle.index}</span>
                <dt className="mt-3 text-[1.125rem] leading-snug font-semibold tracking-[-0.015em]">
                  {principle.title}
                </dt>
                <dd className="mt-2.5 text-[0.9375rem] leading-relaxed text-graphite">
                  {principle.body}
                </dd>
              </Reveal>
            ))}
          </dl>

          <Reveal delay={140}>
            <p className="mt-8 max-w-[46rem] border-t border-mist pt-6 text-sm leading-relaxed text-graphite">
              These are the principles we build against, stated plainly. We do not currently hold
              third-party security certifications, and we would rather say so than display a badge
              we have not earned.
            </p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

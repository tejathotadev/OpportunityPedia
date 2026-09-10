import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { approachPillars } from '@/marketing/data/content';

/**
 * Three company capabilities. Technology is the enabler, not the headline —
 * the value stated here is clarity, timing, coordination and action.
 */
export function Approach() {
  return (
    <Section id="approach" divider surface="white" aria-labelledby="approach-heading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-3">
          <Reveal>
            <SectionLabel index="02">OUR APPROACH</SectionLabel>
          </Reveal>
        </div>
        <div className="lg:col-span-9">
          <Reveal>
            <EditorialHeading id="approach-heading" size="display" className="max-w-[24ch]">
              From scattered information to a clear next step.
            </EditorialHeading>
          </Reveal>
        </div>
      </div>

      <ol className="mt-14 grid gap-px border-t border-mist bg-mist md:mt-20 lg:grid-cols-3">
        {approachPillars.map((pillar, i) => (
          <Reveal
            as="li"
            key={pillar.title}
            delay={i * 100}
            className="bg-white px-0 py-8 lg:px-9"
          >
            <div className="flex items-baseline gap-3">
              <span className="label-meta text-ink">{pillar.index}</span>
              <h3 className="text-title font-semibold">{pillar.title}</h3>
            </div>
            <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed text-graphite">
              {pillar.body}
            </p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}

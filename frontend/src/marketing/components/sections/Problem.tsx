import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { problemFacets } from '@/marketing/data/content';

export function Problem() {
  return (
    <Section id="problem" divider surface="white" aria-labelledby="problem-heading">
      <Reveal className="max-w-[42rem]">
        <SectionLabel>THE PROBLEM</SectionLabel>
        <EditorialHeading id="problem-heading" size="display" className="mt-6">
          Opportunity is fragmented.
        </EditorialHeading>
        <p className="mt-6 max-w-[34rem] text-lead text-graphite">
          Companies discover important signals across dozens of disconnected websites, portals,
          databases and resources. We are building a better way to organize what matters.
        </p>
      </Reveal>

      {/* Four facets as an indexed editorial row, separated by hairlines */}
      <ul className="mt-16 grid border-t border-mist md:mt-20 md:grid-cols-2 lg:grid-cols-4">
        {problemFacets.map((facet, i) => (
          <Reveal
            as="li"
            key={facet.title}
            delay={i * 90}
            className="border-mist px-0 py-7 md:px-7 md:py-8 lg:border-r lg:first:pl-0 lg:last:border-r-0 [&:not(:last-child)]:border-b md:[&:not(:last-child)]:border-b-0 md:[&:nth-child(-n+2)]:border-b lg:[&:nth-child(-n+2)]:border-b-0"
          >
            <span className="label-meta text-ink">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="mt-3 text-[1.1875rem] leading-snug font-semibold tracking-[-0.015em]">
              {facet.title}
            </h3>
            <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-graphite">{facet.body}</p>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

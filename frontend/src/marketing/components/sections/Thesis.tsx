import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading, SerifAccent } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';

/**
 * Editorial break after the hero. One statement, two short paragraphs.
 */
export function Thesis() {
  return (
    <Section divider surface="paper" aria-labelledby="thesis-heading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-3">
          <Reveal>
            <SectionLabel index="01">WHY WE EXIST</SectionLabel>
          </Reveal>
        </div>

        <div className="lg:col-span-9 lg:pr-12">
          <Reveal>
            <EditorialHeading id="thesis-heading" size="display" className="max-w-[26ch]">
              There is more information than ever.{' '}
              <span className="text-graphite/80">
                Finding what <SerifAccent>matters</SerifAccent> has only become harder.
              </span>
            </EditorialHeading>
          </Reveal>

          <div className="mt-10 grid gap-8 border-t border-mist pt-8 md:grid-cols-2 md:gap-12 lg:mt-14 lg:pt-10">
            <Reveal delay={80}>
              <p className="text-lead text-graphite">
                Teams spend hours every day searching across websites, portals and documents just to
                find the next customer, partner or market move.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-lead text-graphite">
                OpportunityX builds OpportunityPedia so that work stops being a manual scavenger
                hunt — and starts being a clear path from finding to acting.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </Section>
  );
}

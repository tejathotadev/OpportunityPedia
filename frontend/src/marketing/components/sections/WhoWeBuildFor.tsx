import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { audiences } from '@/marketing/data/content';

export function WhoWeBuildFor() {
  return (
    <Section divider surface="white" aria-labelledby="audience-heading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <Reveal>
            <SectionLabel>WHO WE BUILD FOR</SectionLabel>
            <EditorialHeading id="audience-heading" size="display" className="mt-6 max-w-[20ch]">
              Built for teams whose advantage is timing.
            </EditorialHeading>
            <p className="mt-6 max-w-[32rem] text-lead text-graphite">
              The same opportunity means something different depending on who sees it. These are
              the roles the product is shaped around.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <ul className="grid border-t border-mist sm:grid-cols-2">
            {audiences.map((audience, i) => (
              <Reveal
                as="li"
                key={audience.role}
                delay={(i % 2) * 70}
                className="border-b border-mist py-6 sm:px-6 sm:even:border-l sm:first:pl-0 sm:[&:nth-child(odd)]:pl-0"
              >
                <h3 className="text-[0.8125rem] font-semibold tracking-[0.1em] text-forest uppercase">
                  {audience.role}
                </h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink">{audience.help}</p>
                <p className="mt-2 text-sm leading-relaxed text-graphite">{audience.challenge}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

import type { CSSProperties } from 'react';
import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { workflowStages } from '@/marketing/data/content';
import { useInView } from '@/marketing/hooks/useInView';

/**
 * Three outcome stages for OpportunityPedia — what using the product feels
 * like, not how information is collected.
 */
export function HowItWorks() {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '0px 0px -15% 0px' });
  const visible = inView ? 'true' : 'false';

  return (
    <Section divider surface="white" aria-labelledby="how-heading">
      <div className="max-w-[40rem]">
        <Reveal>
          <SectionLabel>HOW OPPORTUNITYPEDIA HELPS</SectionLabel>
          <EditorialHeading id="how-heading" size="display" className="mt-6">
            Discover. Prioritize. Act.
          </EditorialHeading>
          <p className="mt-6 max-w-[34rem] text-lead text-graphite">
            A simple loop teams can run every day — without learning a new research process.
          </p>
        </Reveal>
      </div>

      <div ref={ref} className="mt-14 md:mt-16">
        <div className="relative hidden md:block">
          <div className="absolute inset-x-0 top-[2.6rem] h-px bg-mist" aria-hidden="true">
            <div
              data-visible={visible}
              className="reveal-line h-px bg-forest"
              style={{ '--reveal-delay': '100ms' } as CSSProperties}
            />
          </div>

          <ol className="relative grid grid-cols-3">
            {workflowStages.map((stage, i) => (
              <li
                key={stage.index}
                data-visible={visible}
                className="reveal pr-8 last:pr-0"
                style={{ '--reveal-delay': `${160 + i * 110}ms` } as CSSProperties}
              >
                <p className="text-[0.8125rem] font-semibold tracking-[0.1em] text-forest uppercase">
                  {stage.title}
                </p>
                <p className="label-meta mt-1.5 text-graphite/55">{stage.index}</p>
                <div className="relative mt-6 h-5" aria-hidden="true">
                  <span className="absolute top-[-0.3rem] left-0 size-2.5 rounded-full border-2 border-forest bg-white" />
                </div>
                <p className="text-sm leading-relaxed text-graphite">{stage.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <ol className="relative md:hidden">
          <div
            className="absolute top-2 bottom-2 left-[0.3125rem] w-px bg-mist"
            aria-hidden="true"
          />
          {workflowStages.map((stage, i) => (
            <li
              key={stage.index}
              data-visible={visible}
              className="reveal relative pb-8 pl-8 last:pb-0"
              style={{ '--reveal-delay': `${100 + i * 90}ms` } as CSSProperties}
            >
              <span
                aria-hidden="true"
                className="absolute top-1.5 left-0 size-2.5 rounded-full border-2 border-forest bg-white"
              />
              <div className="flex items-center gap-2.5">
                <span className="text-[0.75rem] font-semibold tracking-[0.1em] text-forest uppercase">
                  {stage.title}
                </span>
                <span className="label-meta text-graphite/55">{stage.index}</span>
              </div>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-graphite">{stage.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

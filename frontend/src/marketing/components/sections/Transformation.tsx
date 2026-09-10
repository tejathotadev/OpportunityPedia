import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { AnimatedSignalPipeline } from '@/marketing/components/visuals/AnimatedSignalPipeline';

export function Transformation() {
  return (
    <Section divider surface="paper" aria-labelledby="transformation-heading">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
        <div className="max-w-[38rem]">
          <Reveal>
            <SectionLabel>HOW A SOURCE BECOMES AN ACTION</SectionLabel>
            <EditorialHeading id="transformation-heading" size="display" className="mt-6">
              One page. Five steps. A decision.
            </EditorialHeading>
          </Reveal>
        </div>
        <Reveal delay={80}>
          <SignalIndex
            layout="stack"
            entries={[
              { key: 'Example', value: 'Illustrative workflow' },
              { key: 'Type', value: 'Hiring' },
            ]}
          />
        </Reveal>
      </div>

      <div className="mt-14 md:mt-16">
        <AnimatedSignalPipeline />
      </div>
    </Section>
  );
}

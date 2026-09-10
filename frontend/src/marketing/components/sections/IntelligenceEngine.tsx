import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { OpportunityFlow } from '@/marketing/components/visuals/OpportunityFlow';

export function IntelligenceEngine() {
  return (
    <Section divider surface="paper" aria-labelledby="engine-heading">
      <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-10">
        {/* The statement holds in place while the taller engine entry scrolls past */}
        <div className="lg:sticky lg:top-28 lg:col-span-5">
          <Reveal>
            <SectionLabel>THE INTELLIGENCE LAYER</SectionLabel>
            <EditorialHeading id="engine-heading" size="display" className="mt-6">
              Every signal keeps its paper trail.
            </EditorialHeading>
            <p className="mt-6 max-w-[34rem] text-lead text-graphite">
              A signal is only useful if a team can tell where it came from, what it means and how
              urgent it is. Each entry carries that context from the source through to the action —
              which is also what makes it possible to disagree with a classification.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <SignalIndex
              className="mt-10 border-t border-mist pt-5"
              layout="stack"
              entries={[
                { key: 'IDX', value: '0247' },
                { key: 'Type', value: 'Leadership' },
                { key: 'Status', value: 'Very Hot' },
                { key: 'Source', value: 'Company announcement' },
                { key: 'Updated', value: '2h' },
              ]}
            />
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal delay={100}>
            <OpportunityFlow />
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

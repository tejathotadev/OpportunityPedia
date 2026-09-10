import { Check, Mail, UserCheck } from 'lucide-react';
import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { Reveal } from '@/marketing/components/common/Reveal';
import { SignalBadge } from '@/marketing/components/common/SignalBadge';

/**
 * Ownership and activity visibility — the strongest OpportunityX
 * differentiator, so it gets its own section rather than a slot in a grid.
 */
const timeline = [
  {
    icon: UserCheck,
    label: 'Assigned',
    detail: 'Vishal Kendre',
    time: '11:04 AM',
  },
  {
    icon: Mail,
    label: 'Outreach',
    detail: 'Sent',
    time: '11:16 AM',
  },
  {
    icon: Check,
    label: 'Status',
    detail: 'Contacted',
    time: '11:16 AM',
  },
] as const;

export function TeamCoordination() {
  return (
    <Section divider surface="white" aria-labelledby="coordination-heading">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <Reveal>
            <SectionLabel>TEAM COORDINATION</SectionLabel>
            <EditorialHeading id="coordination-heading" size="display" className="mt-6 max-w-[18ch]">
              Two people, one opportunity, one outreach.
            </EditorialHeading>
            <p className="mt-6 max-w-[34rem] text-lead text-graphite">
              Your team can see what&rsquo;s being worked before someone sends the same outreach
              twice. Ownership is attached at the moment work starts, and every action is recorded
              against the opportunity.
            </p>
            <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-relaxed text-graphite">
              It sounds small. In practice it is the difference between looking coordinated to a
              prospect and looking like three separate companies.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal delay={100}>
            <div className="border border-mist bg-paper">
              <div className="border-b border-mist px-5 py-4 md:px-6 md:py-5">
                <p className="label-meta text-graphite/60">Opportunity · IDX / 0247</p>
                <h3 className="mt-2 text-title font-semibold">Enterprise Cloud Modernization</h3>
                <div className="mt-3.5">
                  <SignalBadge temperature="very-hot" />
                </div>
              </div>

              <ol className="divide-y divide-mist">
                {timeline.map((entry) => (
                  <li
                    key={entry.label}
                    className="flex items-center gap-4 px-5 py-4 md:px-6"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center border border-mist bg-white text-forest"
                    >
                      <entry.icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="label-meta text-graphite/60">{entry.label}</p>
                      <p className="mt-1 text-[0.9375rem] font-medium text-ink">{entry.detail}</p>
                    </div>
                    <p className="label-meta shrink-0 text-graphite/60">{entry.time}</p>
                  </li>
                ))}
              </ol>

              <p className="border-t border-mist bg-white px-5 py-3.5 text-xs text-graphite md:px-6">
                Illustrative activity record.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

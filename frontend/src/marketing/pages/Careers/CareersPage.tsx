import { useEffect } from 'react';
import { PageHero } from '@/marketing/components/sections/PageHero';
import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { LinkButton } from '@/marketing/components/common/Button';
import { Reveal } from '@/marketing/components/common/Reveal';
import { useSeo } from '@/marketing/hooks/useSeo';
import { track } from '@/marketing/lib/analytics';

/** No roles are open. The list stays empty rather than inventing vacancies. */
const openRoles: { title: string; team: string; location: string; to: string }[] = [];

const howWeWork = [
  {
    index: '01',
    title: 'Small scope, real depth',
    body: 'We would rather ship one part of the workflow properly than five parts approximately.',
  },
  {
    index: '02',
    title: 'Write things down',
    body: 'Decisions are recorded so the reasoning survives longer than the meeting.',
  },
  {
    index: '03',
    title: 'Close to the problem',
    body: 'Everyone building the product spends time with how teams actually do this work today.',
  },
  {
    index: '04',
    title: 'Honest by default',
    body: 'We do not overstate what the product does — internally or on this website.',
  },
] as const;

export default function CareersPage() {
  useSeo({
    title: 'Careers',
    description:
      'Build what helps people move first. OpportunityPedia is building the systems behind a new category of opportunity intelligence.',
    path: '/careers',
  });

  useEffect(() => {
    track('careers_view', { openRoles: openRoles.length });
  }, []);

  return (
    <>
      <PageHero
        eyebrow="CAREERS"
        headline="Build what helps people move first."
        lead="We're building the systems behind a new category of opportunity intelligence."
        index={[
          { key: 'Open roles', value: String(openRoles.length) },
          { key: 'Applications', value: 'Always read' },
        ]}
      />

      {/* Why OpportunityPedia */}
      <Section divider surface="white" aria-labelledby="why-join-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Reveal>
              <SectionLabel>WHY OPPORTUNITYPEDIA</SectionLabel>
              <EditorialHeading id="why-join-heading" size="display" className="mt-6 max-w-[16ch]">
                An unglamorous problem worth solving properly.
              </EditorialHeading>
            </Reveal>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <Reveal delay={80}>
              <p className="text-lead text-graphite">
                Opportunity research is one of those tasks that every commercial team does and
                nobody has a good system for. It is repetitive, it is fragmented across a dozen
                tools, and the cost of doing it badly is invisible until a competitor gets there
                first.
              </p>
              <p className="mt-6 text-lead text-graphite">
                Working here means designing the structure underneath that — the indexing, the
                classification, the coordination. It is careful work with a very direct payoff for
                the people who use it.
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* How we work */}
      <Section divider surface="paper" aria-labelledby="how-we-work-heading">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Reveal>
              <SectionLabel>HOW WE WORK</SectionLabel>
              <EditorialHeading
                id="how-we-work-heading"
                size="display"
                className="mt-6 max-w-[14ch]"
              >
                Four habits we protect.
              </EditorialHeading>
            </Reveal>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <dl className="border-t border-mist">
              {howWeWork.map((item, i) => (
                <Reveal
                  key={item.title}
                  delay={i * 80}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-mist py-6"
                >
                  <span className="label-meta pt-1 text-ink">{item.index}</span>
                  <div>
                    <dt className="text-[1.125rem] leading-snug font-semibold tracking-[-0.015em]">
                      {item.title}
                    </dt>
                    <dd className="mt-2 text-[0.9375rem] leading-relaxed text-graphite">
                      {item.body}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </Section>

      {/* Open roles */}
      <Section divider surface="white" aria-labelledby="roles-heading">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <SectionLabel>OPEN ROLES</SectionLabel>
            <EditorialHeading id="roles-heading" size="display" className="mt-6">
              Open positions
            </EditorialHeading>
          </Reveal>
          <p className="label-meta">
            {openRoles.length} {openRoles.length === 1 ? 'position' : 'positions'}
          </p>
        </div>

        {openRoles.length > 0 ? (
          <ul className="mt-10 border-t border-mist">
            {openRoles.map((role) => (
              <li key={role.title} className="border-b border-mist">
                <LinkButton
                  to={role.to}
                  variant="tertiary"
                  arrow="right"
                  className="flex w-full items-center justify-between gap-6 py-6"
                >
                  <span className="text-title font-semibold">{role.title}</span>
                  <span className="label-meta">
                    {role.team} · {role.location}
                  </span>
                </LinkButton>
              </li>
            ))}
          </ul>
        ) : (
          <Reveal delay={80}>
            <div className="field-dots mt-10 border border-mist bg-paper px-6 py-14 md:px-10">
              <p className="max-w-[34rem] text-title font-semibold">
                We don&rsquo;t have any roles listed right now.
              </p>
              <p className="mt-4 max-w-[38rem] text-[1.0625rem] leading-relaxed text-graphite">
                Open positions will appear here. If you think you should be working on this
                regardless, tell us what you would build and why — we read everything that comes
                through.
              </p>
              <LinkButton to="/contact" className="mt-8">
                Introduce yourself
              </LinkButton>
            </div>
          </Reveal>
        )}
      </Section>
    </>
  );
}

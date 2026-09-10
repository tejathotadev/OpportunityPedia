import { Section } from '@/marketing/components/layout/Section';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { LinkButton } from '@/marketing/components/common/Button';
import { Reveal } from '@/marketing/components/common/Reveal';

export function CompanyNote() {
  return (
    <Section divider surface="white" aria-labelledby="company-note-heading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <Reveal>
            <SectionLabel>THE COMPANY</SectionLabel>
          </Reveal>
        </div>

        <div className="lg:col-span-8">
          <Reveal>
            <EditorialHeading id="company-note-heading" size="display" className="max-w-[22ch]">
              Building an opportunity intelligence company.
            </EditorialHeading>

            <div className="mt-8 grid max-w-[52rem] gap-6 md:grid-cols-2 md:gap-10">
              <p className="text-lead text-graphite">
                OpportunityPedia was created around a simple observation: teams spend enormous
                amounts of time searching for information that already exists.
              </p>
              <p className="text-lead text-graphite">
                Our goal is to organize that information into products that help people understand
                what matters, when it matters, and what to do next.
              </p>
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <LinkButton to="/company" variant="secondary" size="lg">
                About OpportunityPedia
              </LinkButton>
              <LinkButton to="/careers" variant="tertiary" arrow="right">
                Join the team
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

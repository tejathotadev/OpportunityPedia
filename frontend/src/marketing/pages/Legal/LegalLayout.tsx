import type { ReactNode } from 'react';
import { Container } from '@/marketing/components/layout/Container';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';

/**
 * Shared shell for /privacy and /terms.
 *
 * The bodies are marked as placeholders. Legal copy has to come from the
 * company, not from a website build, so nothing here asserts a policy.
 */
export function LegalLayout({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Container width="narrow" className="py-14 md:py-20">
      <SectionLabel>{eyebrow}</SectionLabel>
      <EditorialHeading as="h1" size="display" className="mt-6">
        {title}
      </EditorialHeading>

      <SignalIndex
        className="mt-8 border-y border-mist py-4"
        entries={[
          { key: 'Status', value: 'Placeholder' },
          { key: 'Version', value: 'Draft' },
        ]}
      />

      <div className="mt-8 border border-mist bg-paper-warm px-5 py-4">
        <p className="text-[0.9375rem] leading-relaxed text-ink">
          This page is a structural placeholder. The final wording must be supplied and reviewed by
          OpportunityPedia before launch — nothing below should be treated as a policy in force.
        </p>
      </div>

      <div className="mt-10 space-y-8 [&_h2]:text-[1.25rem] [&_h2]:font-semibold [&_h2]:tracking-[-0.015em] [&_p]:mt-3 [&_p]:text-[1.0625rem] [&_p]:leading-relaxed [&_p]:text-graphite">
        {children}
      </div>
    </Container>
  );
}

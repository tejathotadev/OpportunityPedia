import { LegalLayout } from './LegalLayout';
import { useSeo } from '@/marketing/hooks/useSeo';

export default function PrivacyPage() {
  useSeo({
    title: 'Privacy',
    description: 'Privacy information for OpportunityPedia.',
    path: '/privacy',
    index: false,
  });

  return (
    <LegalLayout eyebrow="LEGAL" title="Privacy">
      <section>
        <h2>Information we handle</h2>
        <p>
          Placeholder. This section should describe what information OpportunityPedia collects
          through this website and its products, and why.
        </p>
      </section>
      <section>
        <h2>How information is used</h2>
        <p>
          Placeholder. This section should describe the purposes for which information is used and
          the basis for that use.
        </p>
      </section>
      <section>
        <h2>Sources</h2>
        <p>
          Placeholder. This section should describe how OpportunityPedia treats information drawn
          from external sources within its products.
        </p>
      </section>
      <section>
        <h2>Retention and security</h2>
        <p>
          Placeholder. This section should describe retention periods and the safeguards applied to
          account and organizational data.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          Placeholder. This section should describe the requests a person can make and how to make
          them.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Placeholder. A contact route for privacy questions should be published here once
          confirmed.
        </p>
      </section>
    </LegalLayout>
  );
}

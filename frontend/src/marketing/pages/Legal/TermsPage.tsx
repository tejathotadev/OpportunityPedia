import { LegalLayout } from './LegalLayout';
import { useSeo } from '@/marketing/hooks/useSeo';

export default function TermsPage() {
  useSeo({
    title: 'Terms',
    description: 'Terms information for OpportunityPedia.',
    path: '/terms',
    index: false,
  });

  return (
    <LegalLayout eyebrow="LEGAL" title="Terms">
      <section>
        <h2>Use of this website</h2>
        <p>
          Placeholder. This section should set out the terms on which this website may be used.
        </p>
      </section>
      <section>
        <h2>Products</h2>
        <p>
          Placeholder. This section should explain that access to OpportunityX is governed by a
          separate agreement.
        </p>
      </section>
      <section>
        <h2>Illustrative content</h2>
        <p>
          Placeholder. Product interfaces, opportunities, organizations and activity shown on this
          website are illustrative and do not represent live data or real organizations.
        </p>
      </section>
      <section>
        <h2>Intellectual property</h2>
        <p>Placeholder. This section should address ownership of site and product content.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>Placeholder. This section should explain how and when these terms may change.</p>
      </section>
    </LegalLayout>
  );
}

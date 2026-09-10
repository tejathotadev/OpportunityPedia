import { Container } from '@/marketing/components/layout/Container';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { LinkButton } from '@/marketing/components/common/Button';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { primaryNav } from '@/marketing/data/site';
import { useSeo } from '@/marketing/hooks/useSeo';

export default function NotFoundPage() {
  useSeo({
    title: 'Page not found',
    description: 'The page you were looking for could not be found.',
    path: '/404',
    index: false,
  });

  return (
    <Container width="narrow" className="py-20 md:py-28">
      <SectionLabel>ERROR 404</SectionLabel>
      <EditorialHeading as="h1" size="display" className="mt-6">
        This entry isn&rsquo;t in the index.
      </EditorialHeading>
      <p className="mt-6 max-w-[32rem] text-lead text-graphite">
        The page you were looking for doesn&rsquo;t exist, or it has moved. Everything else is
        still where you left it.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <LinkButton to="/" size="lg">
          Back to homepage
        </LinkButton>
        <LinkButton to="/products/opportunitypedia" variant="secondary" size="lg">
          Explore OpportunityPedia
        </LinkButton>
      </div>

      <nav aria-label="Site sections" className="mt-14 border-t border-mist pt-6">
        <p className="label-meta">Or jump to</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          {primaryNav.map((item) => (
            <li key={item.to}>
              <LinkButton to={item.to} variant="tertiary" arrow="right">
                {item.label}
              </LinkButton>
            </li>
          ))}
        </ul>
      </nav>

      <SignalIndex
        className="mt-12 border-t border-mist pt-5"
        entries={[
          { key: 'Status', value: 'Not found' },
          { key: 'Code', value: '404' },
        ]}
      />
    </Container>
  );
}

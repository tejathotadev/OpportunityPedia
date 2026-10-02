import { Link } from 'react-router-dom';
import { Logo } from '@/shared/brand/Logo';
import { Container } from '@/marketing/components/layout/Container';
import { SignalIndex } from '@/marketing/components/brand/SignalIndex';
import { flagshipProduct } from '@/marketing/data/products';
import { copyrightNotice, footerNav, legalEntity, site } from '@/marketing/data/site';

export function Footer() {
  return (
    <footer className="border-t border-mist bg-paper">
      <Container className="py-14 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-16">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-graphite">
              {site.footerDescription}
            </p>
            <SignalIndex
              className="mt-6"
              layout="stack"
              entries={[
                { key: 'Company', value: site.name },
                { key: 'Flagship product', value: flagshipProduct.name },
              ]}
            />
          </div>

          {/* Column count tracks `footerNav` — update both together. */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footerNav.map((group) => (
              <nav key={group.heading} aria-labelledby={`footer-${group.heading}`}>
                <h2 id={`footer-${group.heading}`} className="label-meta text-ink">
                  {group.heading}
                </h2>
                <ul className="mt-4 space-y-1">
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className="inline-flex min-h-9 items-center text-[0.9375rem] text-graphite transition-colors hover:text-ink"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-14 grid gap-6 border-t border-mist pt-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-12">
          <div className="text-sm leading-relaxed text-graphite">
            <p className="font-medium text-ink">{legalEntity.name}</p>
            <address className="mt-1 not-italic">
              {legalEntity.addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <p className="mt-1">CIN: {legalEntity.cin}</p>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-graphite md:text-right">
            {flagshipProduct.name} is a product of {legalEntity.name}.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-mist pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-graphite">{copyrightNotice}</p>
          <p className="label-meta">{site.tagline}</p>
        </div>
      </Container>
    </footer>
  );
}

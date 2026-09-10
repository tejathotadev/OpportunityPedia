import type { ReactNode } from 'react';
import { Container } from '@/marketing/components/layout/Container';
import { SectionLabel } from '@/marketing/components/common/SectionLabel';
import { EditorialHeading } from '@/marketing/components/common/EditorialHeading';
import { SignalIndex, type SignalIndexEntry } from '@/marketing/components/brand/SignalIndex';
import { cn } from '@/shared/cn';

type PageHeroProps = {
  eyebrow: string;
  headline: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  index?: SignalIndexEntry[];
  /** Optional right-hand visual; without it the hero stays a single column. */
  aside?: ReactNode;
  surface?: 'paper' | 'navy';
};

/** Shared inner-page hero. Left-aligned, asymmetric, same rhythm as the homepage. */
export function PageHero({
  eyebrow,
  headline,
  lead,
  actions,
  index,
  aside,
  surface = 'paper',
}: PageHeroProps) {
  const inverse = surface === 'navy';

  return (
    <section
      aria-labelledby="page-hero-heading"
      className={cn('relative overflow-hidden', inverse ? 'op-stage bg-navy' : 'bg-paper')}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]',
          inverse ? 'opacity-[0.09]' : 'field-grid opacity-60',
        )}
        style={
          inverse
            ? {
                backgroundImage:
                  'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
                backgroundSize: '72px 72px',
              }
            : undefined
        }
      />

      <Container width="wide" className="relative">
        <div
          className={cn(
            'grid gap-10 pt-12 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24',
            aside ? 'lg:grid-cols-[minmax(0,47fr)_minmax(0,53fr)] lg:items-center lg:gap-14' : '',
          )}
        >
          <div className={cn(aside ? 'max-w-[36rem]' : 'max-w-[46rem]')}>
            <SectionLabel tone={inverse ? 'inverse' : 'default'}>{eyebrow}</SectionLabel>

            <EditorialHeading
              as="h1"
              size="hero"
              id="page-hero-heading"
              className={cn('mt-6 md:mt-7', inverse && 'text-white')}
            >
              {headline}
            </EditorialHeading>

            {lead ? (
              <p
                className={cn(
                  'mt-6 max-w-[36rem] text-lead md:mt-7',
                  inverse ? 'text-white/65' : 'text-graphite',
                )}
              >
                {lead}
              </p>
            ) : null}

            {actions ? (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-9">
                {actions}
              </div>
            ) : null}

            {index ? (
              <SignalIndex
                entries={index}
                tone={inverse ? 'inverse' : 'default'}
                className={cn(
                  'mt-10 border-t pt-5',
                  inverse ? 'border-white/15' : 'border-mist',
                )}
              />
            ) : null}
          </div>

          {aside ? <div className="lg:pl-4">{aside}</div> : null}
        </div>
      </Container>
    </section>
  );
}

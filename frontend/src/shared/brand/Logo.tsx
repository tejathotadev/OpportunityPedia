import { Link } from 'react-router-dom';
import { cn } from '@/shared/cn';
import markDark from '@/shared/brand/mark.png';
import markLight from '@/shared/brand/mark-light.png';

/** Intrinsic size of the generated artwork, used to reserve layout space. */
const MARK_W = 160;
const MARK_H = 192;

/**
 * BrandMark — shared mark artwork for OpportunityX / OpportunityPedia.
 *
 * The source artwork shipped as opaque RGB on a white field; `scripts/logo-build.mjs`
 * keys out that white, trims to the artwork and writes the two tones used here.
 */
export function BrandMark({
  className,
  tone = 'default',
  alt = '',
}: {
  className?: string;
  tone?: 'default' | 'inverse';
  alt?: string;
}) {
  return (
    <img
      src={tone === 'inverse' ? markLight : markDark}
      width={MARK_W}
      height={MARK_H}
      alt={alt}
      aria-hidden={alt === '' ? true : undefined}
      className={cn('h-7 w-auto shrink-0 select-none', className)}
    />
  );
}

type LogoProps = {
  className?: string;
  tone?: 'default' | 'inverse';
  variant?: 'full' | 'mark';
  asLink?: boolean;
  /**
   * `company` — OpportunityX (marketing site).
   * `product` — OpportunityPedia (app shell).
   */
  entity?: 'company' | 'product';
};

/**
 * Logo lockup. Marketing uses the company name; the app uses the product name
 * with a quiet company endorsement underneath.
 */
export function Logo({
  className,
  tone = 'default',
  variant = 'full',
  asLink = true,
  entity = 'company',
}: LogoProps) {
  const inverse = tone === 'inverse';
  const primary = entity === 'company' ? 'OpportunityX' : 'OpportunityPedia';
  const homeTo = entity === 'company' ? '/' : '/app/overview';
  const ariaLabel = entity === 'company' ? 'OpportunityX — home' : 'OpportunityPedia — home';

  const inner = (
    <span className={cn('inline-flex items-center gap-[0.5625rem]', className)}>
      <BrandMark tone={tone} className="h-[1.875rem]" />
      {variant === 'full' ? (
        <span className="flex flex-col justify-center gap-[0.1875rem]">
          <span
            className={cn(
              'text-[1.0625rem] leading-none font-semibold tracking-[-0.022em] whitespace-nowrap',
              inverse ? 'text-white' : 'text-ink',
            )}
          >
            {entity === 'company' ? (
              <>
                Opportunity
                <span className={inverse ? 'text-teal' : 'text-teal-ink'}>X</span>
              </>
            ) : (
              primary
            )}
          </span>
          {entity === 'product' ? (
            <span
              className={cn(
                'text-[0.625rem] leading-none tracking-[-0.005em] whitespace-nowrap',
                inverse ? 'text-white/55' : 'text-graphite',
              )}
            >
              by{' '}
              <span className={cn('font-medium', inverse ? 'text-white/80' : 'text-ink/75')}>
                Opportunity
                <span className={inverse ? 'text-teal' : 'text-teal-ink'}>X</span>
              </span>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  if (!asLink) return inner;

  return (
    <Link to={homeTo} aria-label={ariaLabel} className="inline-flex rounded-sm">
      {inner}
    </Link>
  );
}

/** Compact OpportunityX wordmark for menus and product cards. */
export function OpportunityXMark({
  className,
  tone = 'inverse',
}: {
  className?: string;
  tone?: 'default' | 'inverse';
}) {
  return (
    <span className={cn('inline-flex items-baseline gap-[1px]', className)}>
      <span
        className={cn(
          'text-[1.375rem] leading-none font-semibold tracking-[-0.03em]',
          tone === 'inverse' ? 'text-white' : 'text-navy',
        )}
      >
        Opportunity
      </span>
      <span
        className={cn(
          'text-[1.375rem] leading-none font-semibold tracking-[-0.03em]',
          tone === 'inverse' ? 'text-teal' : 'text-teal-ink',
        )}
      >
        X
      </span>
    </span>
  );
}

/** Compact OpportunityPedia wordmark for product surfaces. */
export function OpportunityPediaMark({
  className,
  tone = 'default',
}: {
  className?: string;
  tone?: 'default' | 'inverse';
}) {
  return (
    <span
      className={cn(
        'text-[1.375rem] leading-none font-semibold tracking-[-0.03em]',
        tone === 'inverse' ? 'text-white' : 'text-ink',
        className,
      )}
    >
      OpportunityPedia
    </span>
  );
}

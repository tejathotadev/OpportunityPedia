import type { ReactNode } from 'react';
import { cn } from '@/shared/cn';
import { Container } from './Container';

type SectionProps = {
  children: ReactNode;
  id?: string;
  className?: string;
  containerClassName?: string;
  width?: 'default' | 'wide' | 'narrow';
  /** Section rhythm: 72px mobile → 160px desktop, halved for `tight`. */
  spacing?: 'default' | 'tight' | 'none';
  /** A hairline top rule is the primary section separator in this system. */
  divider?: boolean;
  /**
   * Dark company sections use the forest tones, never `ink`. Ink shares its
   * hue angle with the OpportunityX navy, so an ink surface reads as the
   * product rather than the company. Navy belongs only to product stages.
   */
  surface?: 'paper' | 'white' | 'warm' | 'forest-deep' | 'forest';
  'aria-labelledby'?: string;
};

const surfaces = {
  paper: 'bg-paper text-ink',
  white: 'bg-white text-ink',
  warm: 'bg-paper-warm text-ink',
  'forest-deep': 'bg-forest-deep text-white',
  forest: 'bg-forest text-white',
} as const;

const spacings = {
  default: 'py-section',
  tight: 'py-[calc(var(--spacing-section)*0.55)]',
  none: '',
} as const;

export function Section({
  children,
  id,
  className,
  containerClassName,
  width = 'default',
  spacing = 'default',
  divider = false,
  surface = 'paper',
  'aria-labelledby': ariaLabelledby,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledby}
      className={cn(
        'relative',
        surfaces[surface],
        spacings[spacing],
        divider && 'border-t border-mist',
        surface === 'forest-deep' && divider && 'border-white/12',
        surface === 'forest' && divider && 'border-white/12',
        className,
      )}
    >
      <Container width={width} className={containerClassName}>
        {children}
      </Container>
    </section>
  );
}

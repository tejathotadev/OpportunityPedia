import type { CSSProperties, ElementType, ReactNode } from 'react';
import { cn } from '@/shared/cn';
import { useInView } from '@/marketing/hooks/useInView';

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Stagger in ms. Keep under ~400ms total per group. */
  delay?: number;
  variant?: 'fade-up' | 'line';
  style?: CSSProperties;
};

export function Reveal({
  children,
  as: Tag = 'div',
  className,
  delay = 0,
  variant = 'fade-up',
  style,
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      data-visible={inView ? 'true' : 'false'}
      className={cn(variant === 'line' ? 'reveal-line' : 'reveal', className)}
      style={{ ...style, '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
